const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');
const { parseCsvBuffer, mapRowToTicket } = require('../utils/csvImportHelpers');

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

    // Averiguar cuáles ya existen para no tocarlos
    const idsCandidatos = candidatos.map(d => d['Ticket ID']);
    const existentes = await TicketModel.find({ 'Ticket ID': { $in: idsCandidatos } })
      .select('Ticket ID')
      .lean();
    const existentesSet = new Set(existentes.map(t => t['Ticket ID']));

    const nuevos = candidatos.filter(d => !existentesSet.has(d['Ticket ID']));

    let insertados = 0;
    let erroresInsercion = 0;

    if (nuevos.length > 0) {
      // Se usa el driver nativo (TicketModel.collection) en vez de
      // TicketModel.insertMany para que Mongoose NO recorte campos que no
      // están declarados en el schema (p. ej. "Barcode Data"), igual que
      // el resto de los tickets ya importados directo a Mongo.
      try {
        const resultado = await TicketModel.collection.insertMany(nuevos, { ordered: false });
        insertados = resultado.insertedCount;
      } catch (bulkError) {
        insertados = bulkError?.result?.insertedCount ?? bulkError?.result?.result?.nInserted ?? 0;
        erroresInsercion = nuevos.length - insertados;
        console.error('Errores durante la inserción masiva del CSV:', bulkError.message);
      }
    }

    try {
      await AuditLog.create({
        tipo: 'importacion_csv',
        usuario: req.user._id,
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: {
          archivo: req.file.originalname,
          totalEnArchivo: filas.length,
          yaExistian: existentesSet.size,
          nuevosAgregados: insertados,
          omitidosPorDatosIncompletos,
          erroresInsercion
        },
        ip: req.ip || 'Unknown'
      });
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
    }

    const io = req.app.get('io');
    if (io && insertados > 0) {
      io.emit('tickets-importados', {
        nuevosAgregados: insertados,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `${insertados} ticket(s) nuevo(s) agregado(s). ${existentesSet.size} ya existían y no se modificaron.`,
      data: {
        totalEnArchivo: filas.length,
        yaExistian: existentesSet.size,
        nuevosAgregados: insertados,
        omitidosPorDatosIncompletos,
        erroresInsercion
      }
    });

  } catch (error) {
    console.error('Error al importar CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = { importCsv };
