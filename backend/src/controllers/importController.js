const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');
const { parseCsvBuffer, mapRowToTicket } = require('../utils/csvImportHelpers');
const { emitTicketUpdates } = require('../utils/printHelpers');

// @desc    Importar un CSV del evento: agrega SOLO los tickets que todavía
// no existen (por "Ticket ID"), sin tocar los que ya están (no se pisa
// canjeado/impreso/quién retiró). Pensado para volver a subir el CSV cada
// cierto tiempo y traer las ventas nuevas.
// @route   POST /api/tickets/import-csv
// @access  Private (jefe, importador)
const importCsv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Debe adjuntar un archivo CSV'
      });
    }

    const TicketModel = req.TicketModel || Ticket;

    let filas;
    try {
      filas = await parseCsvBuffer(req.file.buffer);
    } catch (parseError) {
      console.error('Error al parsear CSV:', parseError);
      return res.status(400).json({
        success: false,
        message: 'No se pudo leer el archivo. Verifique que sea un CSV válido.'
      });
    }

    if (filas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El archivo está vacío'
      });
    }

    const candidatos = [];
    const ticketIdsVistos = new Set();
    let omitidosPorDatosIncompletos = 0;

    for (const fila of filas) {
      const doc = mapRowToTicket(fila);
      if (!doc) {
        omitidosPorDatosIncompletos++;
        continue;
      }
      // Evitar duplicados dentro del mismo archivo
      if (ticketIdsVistos.has(doc['Ticket ID'])) continue;
      ticketIdsVistos.add(doc['Ticket ID']);
      candidatos.push(doc);
    }

    if (candidatos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró ningún ticket válido en el archivo (revise que tenga las columnas correctas)'
      });
    }

    // --- Reconciliar con tickets creados a mano ("Agregar Ticket") ---
    // Un ticket manual nace con un Ticket ID sintético (MANUAL-...), no con
    // el real de SquadUp. Si el CSV trae la fila real de esa misma persona
    // (misma Transaction ID + mismo email), se completa el ticket manual con
    // los datos reales (Ticket ID, Seat, Barcode Data, etc.) en vez de
    // crearlo como un ticket nuevo aparte, y ya no se vuelve a marcar como
    // "eliminado" en futuras importaciones.
    const claveManual = (transactionId, email) =>
      `${transactionId}||${(email || '').trim().toLowerCase()}`;

    const manualesSinReconciliar = await TicketModel.find({
      creadoManualmente: true,
      reconciliadoConCsv: { $ne: true }
    });

    const manualPorClave = new Map();
    manualesSinReconciliar.forEach(m => {
      const clave = claveManual(m['Transaction ID'], m['Email']);
      if (!manualPorClave.has(clave)) manualPorClave.set(clave, []);
      manualPorClave.get(clave).push(m);
    });

    const reconciliaciones = [];
    const candidatosRestantes = [];

    for (const candidato of candidatos) {
      const clave = claveManual(candidato['Transaction ID'], candidato['Email']);
      const posibles = manualPorClave.get(clave);

      if (!posibles || posibles.length === 0) {
        candidatosRestantes.push(candidato);
        continue;
      }

      // Si hay más de un manual pendiente para la misma transacción+email,
      // se prioriza el que coincida también en tipo de ticket (localidad)
      const idx = posibles.findIndex(m => m['Ticket'] === candidato['Ticket']);
      const manual = posibles.splice(idx >= 0 ? idx : 0, 1)[0];
      if (posibles.length === 0) manualPorClave.delete(clave);

      // No reconciliar si el Ticket ID real ya existe como documento aparte
      // (evita chocar con el índice único de Ticket ID)
      const yaExisteSeparado = await TicketModel.exists({ 'Ticket ID': candidato['Ticket ID'] });
      if (yaExisteSeparado) {
        candidatosRestantes.push(candidato);
        continue;
      }

      reconciliaciones.push({ manualTicketId: manual['Ticket ID'], candidato });
    }

    const ahoraReconciliacion = new Date();
    const ticketsReconciliados = [];
    for (const { manualTicketId, candidato } of reconciliaciones) {
      await TicketModel.collection.updateOne(
        { 'Ticket ID': manualTicketId },
        {
          $set: {
            'Ticket ID': candidato['Ticket ID'],
            'Seat': candidato['Seat'],
            'Ticket': candidato['Ticket'],
            'Barcode Data': candidato['Barcode Data'],
            'Transaction Date (Local)': candidato['Transaction Date (Local)'],
            reconciliadoConCsv: true,
            fechaReconciliacion: ahoraReconciliacion,
            ticketIdManualOriginal: manualTicketId
          }
        }
      );
      const actualizado = await TicketModel.findOne({ 'Ticket ID': candidato['Ticket ID'] });
      if (actualizado) ticketsReconciliados.push(actualizado);
    }

    // De acá en adelante, los candidatos ya reconciliados NO se procesan
    // como nuevos ni se cuentan como "ya existían": se resolvieron aparte.
    candidatos.length = 0;
    candidatos.push(...candidatosRestantes);

    if (candidatos.length === 0 && reconciliaciones.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró ningún ticket válido en el archivo (revise que tenga las columnas correctas)'
      });
    }

    // Averiguar cuáles ya existen para no tocarlos
    const idsCandidatos = candidatos.map(d => d['Ticket ID']);
    // OJO: la proyección va como objeto, NO como string. Mongoose interpreta
    // .select('Ticket ID') como dos campos separados por espacio ("Ticket" e
    // "ID"), así que el campo real nunca vuelve y todos los tickets parecen
    // nuevos aunque ya existan.
    const existentes = await TicketModel.find({ 'Ticket ID': { $in: idsCandidatos } })
      .select({ 'Ticket ID': 1 })
      .lean();
    const existentesSet = new Set(existentes.map(t => t['Ticket ID']));

    const nuevos = candidatos.filter(d => !existentesSet.has(d['Ticket ID']));

    let insertados = 0;
    let erroresInsercion = 0;
    // Duplicados detectados por el índice único de "Ticket ID" al insertar.
    // Se cuentan como "ya existían", no como error: significa que el ticket
    // ya estaba en la base aunque el chequeo previo no lo haya visto (por
    // ejemplo si el formato guardado difiere del que trae el CSV).
    let duplicadosAlInsertar = 0;

    if (nuevos.length > 0) {
      // Se usa el driver nativo (TicketModel.collection) en vez de
      // TicketModel.insertMany para que Mongoose NO recorte campos que no
      // están declarados en el schema (p. ej. "Barcode Data"), igual que
      // el resto de los tickets ya importados directo a Mongo.
      try {
        const resultado = await TicketModel.collection.insertMany(nuevos, { ordered: false });
        insertados = resultado.insertedCount;
      } catch (bulkError) {
        // Con ordered:false se intentan TODOS los documentos, así que los que
        // fallaron son exactamente los de writeErrors y el resto sí entró.
        const writeErrors = bulkError?.writeErrors || bulkError?.result?.writeErrors || [];
        duplicadosAlInsertar = writeErrors.filter(e => (e.code ?? e.err?.code) === 11000).length;
        erroresInsercion = writeErrors.length - duplicadosAlInsertar;
        insertados = nuevos.length - writeErrors.length;

        if (erroresInsercion > 0) {
          console.error('Errores durante la inserción masiva del CSV:', bulkError.message);
        }
      }
    }

    const yaExistian = existentesSet.size + duplicadosAlInsertar;

    // --- Detección de tickets eliminados del evento ---
    // Todo ticket que esté en la base pero YA NO venga en el CSV significa
    // que se anuló/reembolsó en SquadUp. No se borra: se marca como
    // eliminado para poder auditarlo, y se separan los que además ya
    // habían sido canjeados (caso grave: alguien ya retiró ese boleto).
    // OJO: los reconciliados ya no están en "candidatos" (se sacaron arriba),
    // pero sí vienen en el archivo, así que hay que incluirlos acá también.
    const idsEnArchivo = new Set([
      ...candidatos.map(d => d['Ticket ID']),
      ...reconciliaciones.map(r => r.candidato['Ticket ID'])
    ]);

    // Los manuales sin reconciliar NUNCA van a aparecer en un CSV real (su ID
    // es sintético), así que quedan exentos de la detección de eliminados.
    const enBase = await TicketModel.find({
      eliminado: { $ne: true },
      $or: [
        { creadoManualmente: { $ne: true } },
        { reconciliadoConCsv: true }
      ]
    })
      .select({ 'Ticket ID': 1, canjeado: 1 })
      .lean();

    const desaparecidos = enBase.filter(t => !idsEnArchivo.has(t['Ticket ID']));
    const idsDesaparecidos = desaparecidos.map(t => t['Ticket ID']);
    const eliminadosTrasCanje = desaparecidos.filter(t => t.canjeado === true);

    let ticketsEliminados = [];
    if (idsDesaparecidos.length > 0) {
      const ahora = new Date();
      await TicketModel.updateMany(
        { 'Ticket ID': { $in: idsDesaparecidos }, canjeado: { $ne: true } },
        { $set: { eliminado: true, fechaEliminado: ahora, eliminadoTrasCanje: false } }
      );
      await TicketModel.updateMany(
        { 'Ticket ID': { $in: idsDesaparecidos }, canjeado: true },
        { $set: { eliminado: true, fechaEliminado: ahora, eliminadoTrasCanje: true } }
      );

      ticketsEliminados = await TicketModel.find({ 'Ticket ID': { $in: idsDesaparecidos } });
    }

    const resumen = {
      totalEnArchivo: filas.length,
      yaExistian,
      nuevosAgregados: insertados,
      reconciliados: reconciliaciones.length,
      omitidosPorDatosIncompletos,
      erroresInsercion,
      eliminados: idsDesaparecidos.length,
      eliminadosYaCanjeados: eliminadosTrasCanje.length
    };

    try {
      await AuditLog.create({
        tipo: 'importacion_csv',
        usuario: req.user._id,
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: { archivo: req.file.originalname, ...resumen },
        ip: req.ip || 'Unknown'
      });

      // Los eliminados quedan con su propio registro de auditoría, con el
      // detalle de cuáles eran y cuáles ya se habían canjeado
      if (idsDesaparecidos.length > 0) {
        await AuditLog.create({
          tipo: 'tickets_eliminados',
          usuario: req.user._id,
          puntoTrabajo: req.user.puntoTrabajo,
          detalles: {
            archivo: req.file.originalname,
            eliminados: idsDesaparecidos.length,
            eliminadosYaCanjeados: eliminadosTrasCanje.length,
            ticketIdsYaCanjeados: eliminadosTrasCanje.map(t => t['Ticket ID'])
          },
          ip: req.ip || 'Unknown'
        });
      }
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
    }

    const io = req.app.get('io');
    if (io) {
      if (insertados > 0) {
        io.emit('tickets-importados', {
          nuevosAgregados: insertados,
          timestamp: new Date().toISOString()
        });
      }

      // Pintar en vivo los tickets recién reconciliados (ya con su Ticket ID real)
      if (ticketsReconciliados.length > 0) {
        emitTicketUpdates(io, ticketsReconciliados, 'ticket-reconciliado');
      }

      // Pintar en vivo los tickets que quedaron marcados como eliminados
      if (ticketsEliminados.length > 0) {
        emitTicketUpdates(io, ticketsEliminados, 'ticket-eliminado');

        // Notificación al administrador (la escucha el jefe en cualquier pantalla)
        io.emit('tickets-eliminados-detectados', {
          eliminados: idsDesaparecidos.length,
          eliminadosYaCanjeados: eliminadosTrasCanje.length,
          archivo: req.file.originalname,
          timestamp: new Date().toISOString()
        });
      }
    }

    let message = `${insertados} ticket(s) nuevo(s) agregado(s). ${yaExistian} ya existían y no se modificaron.`;
    if (reconciliaciones.length > 0) {
      message += ` ${reconciliaciones.length} ticket(s) agregado(s) manualmente se completaron con los datos reales del CSV.`;
    }
    if (idsDesaparecidos.length > 0) {
      message += ` ${idsDesaparecidos.length} ya no están en el archivo y se marcaron como eliminados`;
      if (eliminadosTrasCanje.length > 0) {
        message += ` (${eliminadosTrasCanje.length} de ellos YA habían sido canjeados)`;
      }
      message += '.';
    }

    res.json({
      success: true,
      message,
      data: resumen
    });

  } catch (error) {
    console.error('Error al importar CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Listar los tickets que dejaron de aparecer en el CSV (anulados)
// @route   GET /api/tickets/eliminados
// @access  Private (jefe, importador)
const getTicketsEliminados = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const TicketModel = req.TicketModel || Ticket;

    const query = { eliminado: true };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tickets, total, yaCanjeados] = await Promise.all([
      TicketModel.find(query)
        .populate('usuarioCanje', 'nombre usuario')
        .sort({ fechaEliminado: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      TicketModel.countDocuments(query),
      TicketModel.countDocuments({ ...query, eliminadoTrasCanje: true })
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        resumen: { total, yaCanjeados, sinCanjear: total - yaCanjeados },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener tickets eliminados:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// @desc    Alta manual de un ticket (rol importador). Queda como canjeado y
// con la misma forma que los importados del CSV, para que una importación
// posterior lo reconozca por su Ticket ID en vez de duplicarlo.
// @route   POST /api/tickets/manual
// @access  Private (jefe, importador)
const crearTicketManual = async (req, res) => {
  try {
    const { nombre, localidad, cedula, email, transactionId } = req.body;

    const faltantes = [];
    if (!nombre?.trim()) faltantes.push('nombre');
    if (!localidad?.trim()) faltantes.push('localidad');
    if (!cedula?.trim()) faltantes.push('cédula');
    if (!email?.trim()) faltantes.push('email');
    if (!transactionId?.trim()) faltantes.push('Transaction ID');

    if (faltantes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Faltan campos obligatorios: ${faltantes.join(', ')}`
      });
    }

    const TicketModel = req.TicketModel || Ticket;

    // El CSV trae nombre y apellido separados; acá solo se pide "Nombre",
    // así que se parte por el primer espacio para mantener la misma forma.
    const nombreLimpio = nombre.trim().replace(/\s+/g, ' ');
    const partes = nombreLimpio.split(' ');
    const firstName = partes.shift();
    const lastName = partes.join(' ');

    // Ticket ID propio, identificable y sin chocar con los de SquadUp
    const ticketIdManual = `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const ahora = new Date();

    const doc = {
      'First Name': firstName,
      'Last Name': lastName,
      'Email': email.trim(),
      'Ticket': localidad.trim(),
      'Seat': localidad.trim(),
      'Transaction ID': transactionId.trim(),
      'Ticket ID': ticketIdManual,
      'Numero de Cedula:': cedula.trim(),
      canjeado: true,
      fechaCanje: ahora,
      usuarioResponsable: req.user._id,
      usuarioCanje: req.user._id,
      puntoTrabajo: req.user.puntoTrabajo,
      puntoCanje: req.user.puntoTrabajo,
      quienRetira: 'Titular',
      impreso: false,
      creadoManualmente: true
    };

    // Driver nativo para no perder campos no declarados en el schema
    await TicketModel.collection.insertOne(doc);
    const creado = await TicketModel.findOne({ 'Ticket ID': ticketIdManual });

    const io = req.app.get('io');
    emitTicketUpdates(io, [creado], 'ticket-manual');

    try {
      await AuditLog.create({
        tipo: 'ticket_manual',
        usuario: req.user._id,
        ticketId: ticketIdManual,
        transactionId: transactionId.trim(),
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: { nombre: nombreLimpio, localidad: localidad.trim(), cedula: cedula.trim(), email: email.trim() },
        ip: req.ip || 'Unknown'
      });
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
    }

    res.status(201).json({
      success: true,
      message: 'Ticket creado y marcado como canjeado',
      ticket: creado
    });
  } catch (error) {
    console.error('Error al crear ticket manual:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = { importCsv, getTicketsEliminados, crearTicketManual };
