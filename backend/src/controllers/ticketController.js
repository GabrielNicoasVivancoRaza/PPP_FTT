const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');
const PrinterSettings = require('../models/PrinterSettings');
const { createOrExtendPrintRequest } = require('./printRequestController');
const { getUnprintedTransactionTicketIds, markTransactionPrinted, emitTicketUpdates } = require('../utils/printHelpers');
const { propagateCanjeToTransaction } = require('../utils/canjeHelpers');
const { isValidPhone, isValidName, isValidCedula } = require('../utils/validators');
const { construirFilasTickets, filasACsv } = require('../utils/exportHelpers');
const { buildGeneralSearchFilter } = require('../utils/searchHelpers');

// Resuelve el color configurado para un tipo de ticket (campo "Ticket")
const resolveColor = (ticketColors, tipo) => {
  const entry = ticketColors.find(tc => tc.tipo === tipo);
  return entry ? entry.color : null;
};

// @desc    Obtener todos los tickets con filtros
// @route   GET /api/tickets
// @access  Private
const getTickets = async (req, res) => {
  try {
    const { 
      search, 
      seatSearch,
      ticketIdSearch,
      puntoTrabajo, 
      impreso, 
      page = 1, 
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    const filters = [];
    
    // Filtro específico por Ticket ID
    if (ticketIdSearch && ticketIdSearch.trim()) {
      // Ticket ID es String en el schema
      filters.push({ 'Ticket ID': ticketIdSearch.trim() });
    }
    
    // Filtro de búsqueda general (nombre, email, cédula, Ticket ID,
    // Transaction ID) — insensible a tildes y con coincidencia parcial
    if (search && search.trim()) {
      filters.push(buildGeneralSearchFilter(search));
    }
    
    // Filtro por asiento
    if (seatSearch && seatSearch.trim()) {
      const seatRegex = new RegExp(seatSearch.trim(), 'i');
      filters.push({ 'Seat': seatRegex });
    }

    // Combinar filtros con $and si hay más de uno
    if (filters.length > 1) {
      Object.assign(query, { $and: filters });
    } else if (filters.length === 1) {
      Object.assign(query, filters[0]);
    }

    // Filtro por punto de trabajo (para staff / impresor_solo)
    if ((req.user.rol === 'staff' || req.user.rol === 'impresor_solo') && req.user.puntoTrabajo) {
      query.puntoTrabajo = req.user.puntoTrabajo;
    } else if (puntoTrabajo && req.user.rol === 'jefe') {
      query.puntoTrabajo = puntoTrabajo;
    }

    // Filtro por estado de canje. Usar $ne:true (no "false") para incluir
    // tickets importados sin el campo "canjeado" definido en Mongo.
    if (impreso !== undefined) {
      query.canjeado = impreso === 'true' ? true : { $ne: true };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    const [tickets, total] = await Promise.all([
      TicketModel.find(query)
        .populate('usuarioResponsable', 'nombre usuario email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      TicketModel.countDocuments(query)
    ]);

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'X-Timestamp': new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Imprimir ticket
// @route   POST /api/tickets/:id/print
// @access  Private
const printTicket = async (req, res) => {
  try {
    const { quienRetira, quienOtro, parentesco, celular } = req.body;
    const ticketId = req.params.id;

    if (!quienRetira || !celular) {
      return res.status(400).json({
        success: false,
        message: 'Quien retira y celular son campos obligatorios'
      });
    }

    if (quienRetira === 'Otro') {
      if (!quienOtro) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar quién retira cuando selecciona "Otro"'
        });
      }
      if (!parentesco) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar el parentesco cuando selecciona "Otro"'
        });
      }
    }

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    const ticket = await TicketModel.findOne({ 'Ticket ID': ticketId });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // Solo jefe puede reimprimir tickets ya impresos
    if (ticket.impreso && req.user.rol !== 'jefe') {
      return res.status(400).json({
        success: false,
        message: 'Este ticket ya fue impreso'
      });
    }

    // Actualizar ticket
    ticket.impreso = true;
    ticket.fechaImpresion = new Date();
    ticket.usuarioResponsable = req.user._id;
    ticket.puntoTrabajo = req.user.puntoTrabajo;
    ticket.quienRetira = quienRetira;
    ticket.celular = celular;
    
    // Solo establecer campos adicionales si es "Otro"
    if (quienRetira === 'Otro') {
      ticket.quienOtro = quienOtro;
      ticket.parentesco = parentesco;
    } else {
      ticket.quienOtro = undefined;
      ticket.parentesco = undefined;
    }

    await ticket.save();

    // Emitir evento de Socket.IO para actualización en tiempo real
    const io = req.app.get('io');
    if (io) {
      // Emitir a todos los usuarios del mismo punto de venta
      if (ticket.puntoVenta) {
        io.to(`punto-venta-${ticket.puntoVenta}`).emit('ticket-updated', {
          action: 'print',
          ticket: ticket.toObject(),
          timestamp: new Date().toISOString()
        });
      }
      
      // Emitir a staff del punto de trabajo
      if (req.user.puntoTrabajo) {
        io.to(`staff-${req.user.puntoTrabajo}`).emit('ticket-updated', {
          action: 'print',
          ticket: ticket.toObject(),
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: 'Ticket impreso exitosamente',
      ticket
    });

  } catch (error) {
    console.error('Error al imprimir ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Reimprimir ticket
// @route   POST /api/tickets/:id/reprint
// @access  Private (solo jefe e impresor)
const reprintTicket = async (req, res) => {
  try {
    const { motivo } = req.body;
    const ticketId = req.params.id;

    if (!motivo) {
      return res.status(400).json({
        success: false,
        message: 'Motivo de reimpresión es obligatorio'
      });
    }

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    const ticket = await TicketModel.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    if (!ticket.impreso) {
      return res.status(400).json({
        success: false,
        message: 'No se puede reimprimir un ticket que no ha sido impreso'
      });
    }

    // Agregar reimpresión al historial
    ticket.reimpresiones.push({
      fecha: new Date(),
      motivo,
      usuario: req.user._id,
      puntoTrabajo: req.user.puntoTrabajo
    });

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket reimpreso exitosamente',
      ticket
    });

  } catch (error) {
    console.error('Error al reimprimir ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener tickets por transaction ID (incluye el total de tickets asociados)
// @route   GET /api/tickets/transaction/:transactionId
// @access  Private (jefe, staff, impresor_solo, impresor_cola)
const getTicketsByTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;

    const tickets = await TicketModel.find({ 'Transaction ID': transactionId })
      .populate('usuarioResponsable', 'nombre usuario')
      .sort({ 'Seat': 1 });

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron tickets para esta transacción'
      });
    }

    res.json({
      success: true,
      tickets,
      count: tickets.length
    });

  } catch (error) {
    console.error('Error al obtener tickets por transacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Marcar / desmarcar un ticket como fraude
// Un ticket marcado no se puede canjear y se pinta en rojo en la tabla.
// @route   POST /api/tickets/:id/fraude
// @access  Private (solo jefe)
const marcarFraude = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { fraude, motivo } = req.body;

    if (typeof fraude !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El campo "fraude" es obligatorio y debe ser booleano'
      });
    }

    const TicketModel = req.TicketModel || Ticket;
    const ticket = await TicketModel.findOne({ 'Ticket ID': ticketId });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    ticket.fraude = fraude;
    if (fraude) {
      ticket.fechaFraude = new Date();
      ticket.motivoFraude = motivo?.trim() || '';
      ticket.marcadoFraudePor = req.user._id;
    } else {
      ticket.fechaFraude = undefined;
      ticket.motivoFraude = undefined;
      ticket.marcadoFraudePor = undefined;
    }

    await ticket.save();

    const io = req.app.get('io');
    emitTicketUpdates(io, [ticket], fraude ? 'fraude' : 'fraude-quitado');

    try {
      await AuditLog.create({
        tipo: 'fraude',
        usuario: req.user._id,
        ticketId: ticket['Ticket ID'].toString(),
        transactionId: ticket['Transaction ID']?.toString(),
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: {
          accion: fraude ? 'marcar_fraude' : 'quitar_fraude',
          motivo: motivo?.trim() || ''
        },
        ip: req.ip || 'Unknown'
      });
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
    }

    res.json({
      success: true,
      message: fraude ? 'Ticket marcado como fraude' : 'Marca de fraude retirada',
      ticket
    });

  } catch (error) {
    console.error('Error al marcar fraude:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Colocar/quitar una nota informativa en un ticket (solo jefe). Se
// muestra en gris para todos los roles y NO bloquea el canje, a diferencia
// de la marca de fraude.
// @route   POST /api/tickets/:id/informacion
// @access  Private (solo jefe)
const marcarInformacion = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { informacion } = req.body;
    const texto = (informacion || '').trim();

    const TicketModel = req.TicketModel || Ticket;
    const ticket = await TicketModel.findOne({ 'Ticket ID': ticketId });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    if (texto) {
      ticket.informacion = texto;
      ticket.fechaInformacion = new Date();
      ticket.colocadoInformacionPor = req.user._id;
    } else {
      ticket.informacion = undefined;
      ticket.fechaInformacion = undefined;
      ticket.colocadoInformacionPor = undefined;
    }

    await ticket.save();

    const io = req.app.get('io');
    emitTicketUpdates(io, [ticket], texto ? 'informacion' : 'informacion-quitada');

    try {
      await AuditLog.create({
        tipo: 'informacion',
        usuario: req.user._id,
        ticketId: ticket['Ticket ID'].toString(),
        transactionId: ticket['Transaction ID']?.toString(),
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: {
          accion: texto ? 'colocar_informacion' : 'quitar_informacion',
          informacion: texto
        },
        ip: req.ip || 'Unknown'
      });
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
    }

    res.json({
      success: true,
      message: texto ? 'Información guardada' : 'Información retirada',
      ticket
    });

  } catch (error) {
    console.error('Error al colocar información:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Buscar un ticket por su código de barras/QR (campo "Barcode Data")
// Se usa desde el escáner (/escanearTicket). Incluye cuántos tickets tiene
// asociados la transacción, igual que getTicketsByTransaction.
// @route   GET /api/tickets/barcode/:barcodeData
// @access  Private (jefe, staff, impresor_solo, impresor_cola)
const getTicketByBarcode = async (req, res) => {
  try {
    const { barcodeData } = req.params;

    if (!barcodeData || !barcodeData.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Código de barras vacío'
      });
    }

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;

    const ticket = await TicketModel.findOne({ 'Barcode Data': barcodeData.trim() })
      .populate('usuarioResponsable', 'nombre usuario email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró ningún ticket con ese código'
      });
    }

    // Contar cuántos tickets tiene asociados la misma transacción
    const transactionCount = await TicketModel.countDocuments({ 'Transaction ID': ticket['Transaction ID'] });

    res.json({
      success: true,
      ticket,
      transactionCount
    });

  } catch (error) {
    console.error('Error al buscar ticket por código de barras:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener estadísticas de tickets
// @route   GET /api/tickets/stats
// @access  Private (solo jefe)
const getTicketStats = async (req, res) => {
  try {
    const { puntoTrabajo, fechaInicio, fechaFin } = req.query;

    const matchQuery = {};
    
    if (puntoTrabajo) {
      matchQuery.puntoTrabajo = puntoTrabajo;
    }

    // Filtros de fecha para canjes
    if (fechaInicio || fechaFin) {
      matchQuery.fechaCanje = {};
      if (fechaInicio) {
        matchQuery.fechaCanje.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        matchQuery.fechaCanje.$lte = new Date(fechaFin);
      }
    }

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    const [
      totalTickets, 
      ticketsCanjeados,
      ticketsPorDia,
      ticketsPorPunto
    ] = await Promise.all([
      // Total de tickets en el sistema
      TicketModel.countDocuments(),
      
      // Tickets canjeados
      TicketModel.countDocuments({ canjeado: true, ...matchQuery }),
      
      // Evolución diaria de canjes
      TicketModel.aggregate([
        { $match: { canjeado: true, ...matchQuery } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$fechaCanje" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Tickets canjeados por punto de trabajo
      TicketModel.aggregate([
        { $match: { canjeado: true } },
        {
          $group: {
            _id: "$puntoTrabajo",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    const porcentajeCanjeados = totalTickets > 0 ? (ticketsCanjeados / totalTickets) * 100 : 0;
    const ticketsRestantes = totalTickets - ticketsCanjeados;

    res.json({
      success: true,
      stats: {
        totalTickets,
        ticketsCanjeados,
        ticketsRestantes,
        porcentajeCanjeados: Math.round(porcentajeCanjeados * 100) / 100,
        evolucionDiaria: ticketsPorDia,
        ticketsPorPunto
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const redondear = (n) => Math.round(n * 100) / 100;
const porcentaje = (parte, total) => (total > 0 ? redondear((parte / total) * 100) : 0);

// Arma el desglose por localidad (campo "Ticket") a partir de dos mapas de
// conteo: uno con la capacidad total por localidad (sin eliminados) y otro
// con los canjeados (del día o acumulados, según se use). Se incluyen todas
// las localidades con capacidad aunque tengan 0 canjeados ese recorte.
const armarPorLocalidad = (totalesPorLocalidad, canjeadosPorLocalidad, totalCanjeadoGlobal) => {
  return Object.entries(totalesPorLocalidad)
    .map(([localidad, totalLocalidad]) => {
      const canjeados = canjeadosPorLocalidad[localidad] || 0;
      return {
        localidad,
        canjeados,
        totalLocalidad,
        porcentajeDelTotalCanjeado: porcentaje(canjeados, totalCanjeadoGlobal),
        porcentajeDeLocalidad: porcentaje(canjeados, totalLocalidad)
      };
    })
    .sort((a, b) => a.localidad.localeCompare(b.localidad, 'es'));
};

// @desc    Informe diario: total canjeado y desglose por localidad, tanto
// del día seleccionado como acumulado desde el inicio del evento.
// @route   GET /api/tickets/reporte-diario?fecha=YYYY-MM-DD
// @access  Private (solo jefe)
const getReporteDiario = async (req, res) => {
  try {
    const fecha = (req.query.fecha || new Date().toISOString().slice(0, 10)).trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha debe tener el formato YYYY-MM-DD'
      });
    }

    const desde = new Date(`${fecha}T00:00:00.000Z`);
    const hasta = new Date(`${fecha}T23:59:59.999Z`);

    const TicketModel = req.TicketModel || Ticket;

    const [capacidadAgg, canjeadosDiaAgg, canjeadosTotalAgg] = await Promise.all([
      // Capacidad total por localidad: se excluyen los eliminados (ya no son
      // parte real del evento), pero sí se cuentan los marcados como fraude
      // (siguen existiendo, solo no se pueden canjear)
      TicketModel.aggregate([
        { $match: { eliminado: { $ne: true } } },
        { $group: { _id: '$Ticket', total: { $sum: 1 } } }
      ]),
      TicketModel.aggregate([
        { $match: { canjeado: true, fechaCanje: { $gte: desde, $lte: hasta } } },
        { $group: { _id: '$Ticket', total: { $sum: 1 } } }
      ]),
      TicketModel.aggregate([
        { $match: { canjeado: true } },
        { $group: { _id: '$Ticket', total: { $sum: 1 } } }
      ])
    ]);

    const aMapa = (agg) => Object.fromEntries(agg.map(r => [r._id || 'Sin localidad', r.total]));

    const totalesPorLocalidad = aMapa(capacidadAgg);
    const canjeadosDiaPorLocalidad = aMapa(canjeadosDiaAgg);
    const canjeadosTotalPorLocalidad = aMapa(canjeadosTotalAgg);

    const totalCanjeadosDia = Object.values(canjeadosDiaPorLocalidad).reduce((a, b) => a + b, 0);
    const totalCanjeadosTotal = Object.values(canjeadosTotalPorLocalidad).reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      data: {
        fecha,
        dia: {
          totalCanjeados: totalCanjeadosDia,
          porLocalidad: armarPorLocalidad(totalesPorLocalidad, canjeadosDiaPorLocalidad, totalCanjeadosDia)
        },
        total: {
          totalCanjeados: totalCanjeadosTotal,
          porLocalidad: armarPorLocalidad(totalesPorLocalidad, canjeadosTotalPorLocalidad, totalCanjeadosTotal)
        }
      }
    });

  } catch (error) {
    console.error('Error al generar el informe diario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Descargar en CSV la información de TODOS los tickets (canjeados
// o no). Respaldo rápido desde el navegador; el respaldo completo en Excel
// con colores por día de canje se genera con respaldo_tickets.py
// @route   GET /api/tickets/export
// @access  Private (solo jefe)
const exportTicketsCsv = async (req, res) => {
  try {
    const TicketModel = req.TicketModel || Ticket;

    const tickets = await TicketModel.find({})
      .populate('usuarioCanje', 'nombre')
      .populate('usuarioResponsable', 'nombre')
      .sort({ fechaCanje: 1 })
      .lean();

    const csv = filasACsv(construirFilasTickets(tickets));
    const fechaArchivo = new Date().toISOString().slice(0, 10);

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tickets_${fechaArchivo}.csv"`
    });
    res.send(csv);

  } catch (error) {
    console.error('Error al exportar tickets a CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Realizar canje de ticket
// @route   POST /api/tickets/:id/canje
// @access  Private
const canjeTicket = async (req, res) => {
  try {
    const { quienRetira, parentesco, quienOtro, celular, cedulaQuienRetira, ticketsSeleccionados } = req.body;
    const ticketId = req.params.id;

    // Validaciones básicas
    if (!quienRetira || !celular || !cedulaQuienRetira) {
      return res.status(400).json({
        success: false,
        message: 'Quien retira, cédula y celular son campos obligatorios'
      });
    }

    if (!isValidPhone(celular)) {
      return res.status(400).json({
        success: false,
        message: 'El celular debe contener solo números (7 a 15 dígitos)'
      });
    }

    if (!isValidCedula(cedulaQuienRetira)) {
      return res.status(400).json({
        success: false,
        message: 'La cédula debe contener solo números (5 a 15 dígitos)'
      });
    }

    // Validaciones condicionales para "Otro"
    if (quienRetira === 'Otro') {
      if (!parentesco) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar el parentesco cuando selecciona "Otro"'
        });
      }
      if (!quienOtro) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar el nombre de quien retira cuando selecciona "Otro"'
        });
      }
      if (!isValidName(quienOtro)) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de quien retira solo debe contener letras'
        });
      }
    }

    // Validar que quienRetira sea una opción válida
    const opcionesValidas = ['Titular', 'Titular Compra', 'Otro'];
    if (!opcionesValidas.includes(quienRetira)) {
      return res.status(400).json({
        success: false,
        message: 'Opción de retiro no válida'
      });
    }

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    const ticket = await TicketModel.findOne({ 'Ticket ID': ticketId });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // Verificar si el ticket ya fue canjeado
    if (ticket.canjeado) {
      return res.status(400).json({
        success: false,
        message: 'Este ticket ya fue canjeado'
      });
    }

    // Un ticket marcado como fraude no se puede canjear
    if (ticket.fraude) {
      return res.status(400).json({
        success: false,
        message: 'Este ticket está marcado como FRAUDE y no se puede canjear'
      });
    }

    // Tampoco se canjea un ticket que ya no existe en el evento (anulado)
    if (ticket.eliminado) {
      return res.status(400).json({
        success: false,
        message: 'Este ticket fue eliminado del evento (anulado o reembolsado) y no se puede canjear'
      });
    }

    // Actualizar ticket con información de canje
    ticket.canjeado = true;
    ticket.fechaCanje = new Date();
    ticket.usuarioResponsable = req.user._id;
    ticket.usuarioCanje = req.user._id;
    ticket.puntoTrabajo = req.user.puntoTrabajo;
    ticket.puntoCanje = req.user.puntoTrabajo;
    ticket.quienRetira = quienRetira;
    ticket.celular = celular;
    ticket.cedulaQuienRetira = cedulaQuienRetira;

    // Solo establecer campos adicionales si es "Otro"
    if (quienRetira === 'Otro') {
      ticket.parentesco = parentesco;
      ticket.quienOtro = quienOtro;
    } else {
      // Limpiar campos si no es "Otro"
      ticket.parentesco = undefined;
      ticket.quienOtro = undefined;
    }

    // Rol impresor_solo: canjea e imprime en una sola acción
    const printerSettings = await PrinterSettings.getSettings();
    if (printerSettings.enabled && req.user.rol === 'impresor_solo') {
      ticket.impreso = true;
      ticket.fechaImpresion = new Date();
    }

    await ticket.save();

    const io = req.app.get('io');
    let ticketsImpresosTransaccion = 0;

    // Propagar la información de canje SOLO a los tickets que el usuario
    // eligió en el modal (checkboxes). Si no eligió ninguno, se canjea
    // únicamente el ticket actual.
    const seleccionados = Array.isArray(ticketsSeleccionados)
      ? ticketsSeleccionados.filter(id => id && id !== ticket['Ticket ID'])
      : [];

    const otrosCanjeados = await propagateCanjeToTransaction(
      TicketModel,
      ticket['Transaction ID'],
      {
        usuarioId: req.user._id,
        puntoTrabajo: req.user.puntoTrabajo,
        quienRetira,
        celular,
        cedulaQuienRetira,
        parentesco,
        quienOtro
      },
      seleccionados
    );
    const otrosCanjeadosSinActual = otrosCanjeados.filter(t => t['Ticket ID'] !== ticket['Ticket ID']);
    emitTicketUpdates(io, otrosCanjeadosSinActual, 'canje-transaccion');

    // Rol impresor_solo: propagar impresión a TODOS los tickets de la misma
    // transacción y tipo (la impresión en SquadUp es por transacción, no
    // por ticket individual), hayan sido canjeados o no todavía
    if (printerSettings.enabled && req.user.rol === 'impresor_solo') {
      const afectados = await markTransactionPrinted(TicketModel, ticket['Transaction ID'], ticket['Ticket'], req.user.puntoTrabajo);
      ticketsImpresosTransaccion = afectados.length;
      const otros = afectados.filter(t => t['Ticket ID'] !== ticket['Ticket ID']);
      emitTicketUpdates(io, otros, 'impresion-transaccion');
    }

    // Rol staff: encolar solicitud de impresión para impresor_cola con TODOS
    // los tickets de la transacción + tipo (no solo el que se acaba de
    // canjear), ya que se imprimen todos juntos
    if (printerSettings.enabled && req.user.rol === 'staff') {
      const tipo = ticket['Ticket'];
      const ticketIdsTransaccion = await getUnprintedTransactionTicketIds(TicketModel, ticket['Transaction ID'], tipo);
      // Si no queda nada por imprimir (p. ej. otro impresor ya imprimió toda
      // la transacción antes de este canje), no hace falta crear solicitud
      if (ticketIdsTransaccion.length > 0) {
        await createOrExtendPrintRequest({
          transactionId: ticket['Transaction ID'],
          ticketIds: ticketIdsTransaccion,
          tipos: tipo ? [tipo] : [],
          color: resolveColor(printerSettings.ticketColors, tipo),
          puntoTrabajo: req.user.puntoTrabajo,
          usuarioId: req.user._id,
          io
        });
      }
    }

    // Crear log de auditoría de forma segura
    try {
      const auditDetails = {
        ticketId: ticket['Ticket ID'],
        quienRetira,
        celular,
        puntoTrabajo: req.user.puntoTrabajo || 'No asignado'
      };

      // Solo incluir campos adicionales en el log si es "Otro"
      if (quienRetira === 'Otro') {
        auditDetails.parentesco = parentesco;
        auditDetails.quienOtro = quienOtro;
      }

      if (ticket.impreso) {
        auditDetails.impreso = true;
        auditDetails.ticketsImpresosTransaccion = ticketsImpresosTransaccion;
      }

      if (otrosCanjeadosSinActual.length > 0) {
        auditDetails.ticketsCanjeadosTransaccion = otrosCanjeados.length;
      }

      await AuditLog.create({
        tipo: 'canje',
        usuario: req.user._id,
        ticketId: ticket['Ticket ID'].toString(),
        transactionId: ticket['Transaction ID']?.toString(),
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: auditDetails,
        ip: req.ip || 'Unknown'
      });
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
      // No fallar el canje por problemas de auditoría
    }

    // Populate para devolver información completa del usuario
    await ticket.populate('usuarioResponsable', 'nombre usuario email');

    // Emitir a la sala común de tickets para que se actualice en vivo en
    // TODAS las pantallas abiertas (cualquier rol, cualquier dispositivo)
    if (io) {
      io.to('tickets').emit('ticket-updated', {
        action: 'canje',
        ticket: ticket.toObject(),
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Ticket canjeado exitosamente',
      ticket,
      data: {
        ticketsTransaccion: otrosCanjeados.length,
        transactionId: ticket['Transaction ID']
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en canje ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Realizar canje masivo de tickets
// @route   POST /api/tickets/bulk-canje
// @access  Private (Jefe only)
const bulkCanjeTickets = async (req, res) => {
  try {
    const { ticketIds, canjeData } = req.body;
    const { quienRetira, parentesco, celular, cedulaQuienRetira, quienOtro } = canjeData;

    // Validaciones
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un array de ticket IDs'
      });
    }

    if (!quienRetira || !celular || !cedulaQuienRetira) {
      return res.status(400).json({
        success: false,
        message: 'Quien retira, cédula y celular son campos obligatorios'
      });
    }

    if (!isValidPhone(celular)) {
      return res.status(400).json({
        success: false,
        message: 'El celular debe contener solo números (7 a 15 dígitos)'
      });
    }

    if (!isValidCedula(cedulaQuienRetira)) {
      return res.status(400).json({
        success: false,
        message: 'La cédula debe contener solo números (5 a 15 dígitos)'
      });
    }

    if (quienRetira === 'Otro') {
      if (!parentesco || !quienOtro) {
        return res.status(400).json({
          success: false,
          message: 'Parentesco y nombre son obligatorios cuando selecciona "Otro"'
        });
      }
      if (!isValidName(quienOtro)) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de quien retira solo debe contener letras'
        });
      }
    }

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    // Buscar todos los tickets (canjeados y no canjeados) para reportar
    const allTickets = await TicketModel.find({ 
      'Ticket ID': { $in: ticketIds }
    });

    // Separar tickets canjeados y no canjeados. Los marcados como fraude o
    // eliminados quedan fuera: no se pueden canjear.
    const bloqueados = allTickets.filter(t => t.fraude || t.eliminado);
    const canjeables = allTickets.filter(t => !t.fraude && !t.eliminado);
    const ticketsToRedeem = canjeables.filter(t => !t.canjeado);
    const alreadyRedeemed = canjeables.filter(t => t.canjeado);

    if (allTickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron los tickets especificados'
      });
    }

    if (ticketsToRedeem.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Todos los tickets (${alreadyRedeemed.length}) ya fueron canjeados previamente`,
        data: {
          alreadyRedeemed: alreadyRedeemed.length,
          processed: 0
        }
      });
    }

    // Preparar datos de actualización
    const updateData = {
      canjeado: true,
      fechaCanje: new Date(),
      usuarioResponsable: req.user._id,
      usuarioCanje: req.user._id,
      puntoTrabajo: req.user.puntoTrabajo,
      puntoCanje: req.user.puntoTrabajo,
      quienRetira,
      celular,
      cedulaQuienRetira
    };

    if (quienRetira === 'Otro') {
      updateData.parentesco = parentesco;
      updateData.quienOtro = quienOtro;
    }

    // Rol impresor_solo: canjea e imprime en una sola acción
    const printerSettings = await PrinterSettings.getSettings();
    if (printerSettings.enabled && req.user.rol === 'impresor_solo') {
      updateData.impreso = true;
      updateData.fechaImpresion = new Date();
    }

    // Actualizar solo tickets no canjeados en una operación bulk
    const bulkOps = ticketsToRedeem.map(ticket => ({
      updateOne: {
        filter: { _id: ticket._id },
        update: { $set: updateData }
      }
    }));

    const bulkResult = await TicketModel.bulkWrite(bulkOps);

    // En el canje masivo NO se propaga a otros tickets de la transacción:
    // aquí la selección ya es explícita (el usuario marcó exactamente los
    // tickets que quería canjear con las casillas de la tabla).
    const ticketsPropagadosExtra = [];

    // Crear logs de auditoría solo para los tickets canjeados ahora
    const auditLogs = ticketsToRedeem.map(ticket => {
      const auditDetails = {
        ticketId: ticket['Ticket ID'],
        quienRetira,
        celular,
        puntoTrabajo: req.user.puntoTrabajo || 'No asignado',
        bulkOperation: true,
        totalTickets: ticketsToRedeem.length,
        alreadyRedeemed: alreadyRedeemed.length
      };
      
      if (quienRetira === 'Otro') {
        auditDetails.parentesco = parentesco;
        auditDetails.quienOtro = quienOtro;
      }

      if (printerSettings.enabled && req.user.rol === 'impresor_solo') {
        auditDetails.impreso = true;
      }

      return {
        tipo: 'canje_masivo',
        usuario: req.user._id,
        ticketId: ticket['Ticket ID'].toString(),
        transactionId: ticket['Transaction ID']?.toString(),
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: auditDetails,
        ip: req.ip || 'Unknown'
      };
    });

    // Logs de auditoría para los tickets adicionales propagados por transacción
    if (ticketsPropagadosExtra.length > 0) {
      const auditLogsPropagados = ticketsPropagadosExtra.map(ticket => ({
        tipo: 'canje_masivo',
        usuario: req.user._id,
        ticketId: ticket['Ticket ID'].toString(),
        transactionId: ticket['Transaction ID']?.toString(),
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: {
          ticketId: ticket['Ticket ID'],
          quienRetira,
          celular,
          puntoTrabajo: req.user.puntoTrabajo || 'No asignado',
          propagadoDeTransaccion: true
        },
        ip: req.ip || 'Unknown'
      }));
      auditLogs.push(...auditLogsPropagados);
    }

    // Insertar logs en batch
    try {
      await AuditLog.insertMany(auditLogs);
    } catch (auditError) {
      console.error('Error al crear logs de auditoría:', auditError);
    }

    // Obtener tickets actualizados con populate
    const updatedTickets = await TicketModel.find({
      'Ticket ID': { $in: ticketIds }
    }).populate('usuarioResponsable', 'nombre usuario email');

    // Emitir eventos de Socket.IO a la sala común de tickets
    const io = req.app.get('io');
    emitTicketUpdates(io, ticketsPropagadosExtra, 'canje-transaccion');
    emitTicketUpdates(io, updatedTickets, 'canje');

    // Rol impresor_solo: propagar impresión a TODOS los tickets de la misma
    // transacción y tipo (hayan sido canjeados o no), ya que la impresión en
    // SquadUp es por transacción, no por ticket individual
    if (printerSettings.enabled && req.user.rol === 'impresor_solo') {
      const paresUnicos = new Map();
      ticketsToRedeem.forEach(ticket => {
        const key = `${ticket['Transaction ID']}||${ticket['Ticket']}`;
        if (!paresUnicos.has(key)) {
          paresUnicos.set(key, { transactionId: ticket['Transaction ID'], tipo: ticket['Ticket'] });
        }
      });

      for (const { transactionId, tipo } of paresUnicos.values()) {
        const afectados = await markTransactionPrinted(TicketModel, transactionId, tipo, req.user.puntoTrabajo);
        emitTicketUpdates(io, afectados, 'impresion-transaccion');
      }
    }

    // Rol staff: encolar solicitudes de impresión (una por transacción + tipo)
    // con TODOS los tickets de esa transacción/tipo, no solo los canjeados
    // en este lote, ya que se imprimen todos juntos
    if (printerSettings.enabled && req.user.rol === 'staff') {
      const paresUnicos = new Map();
      ticketsToRedeem.forEach(ticket => {
        const key = `${ticket['Transaction ID']}||${ticket['Ticket']}`;
        if (!paresUnicos.has(key)) {
          paresUnicos.set(key, { transactionId: ticket['Transaction ID'], tipo: ticket['Ticket'] });
        }
      });

      for (const { transactionId, tipo } of paresUnicos.values()) {
        const ticketIdsTransaccion = await getUnprintedTransactionTicketIds(TicketModel, transactionId, tipo);
        // Si no queda nada por imprimir, no hace falta crear/extender la solicitud
        if (ticketIdsTransaccion.length === 0) continue;
        await createOrExtendPrintRequest({
          transactionId,
          ticketIds: ticketIdsTransaccion,
          tipos: tipo ? [tipo] : [],
          color: resolveColor(printerSettings.ticketColors, tipo),
          puntoTrabajo: req.user.puntoTrabajo,
          usuarioId: req.user._id,
          io
        });
      }
    }

    // Mensaje personalizado según resultados
    let message = `${bulkResult.modifiedCount} tickets canjeados exitosamente`;
    if (ticketsPropagadosExtra.length > 0) {
      message += ` (+${ticketsPropagadosExtra.length} adicionales de la misma transacción)`;
    }
    if (alreadyRedeemed.length > 0) {
      message += `. ${alreadyRedeemed.length} ya estaban canjeados`;
    }

    res.json({
      success: true,
      message,
      data: {
        ticketsPropagados: ticketsPropagadosExtra.length,
        processed: ticketsToRedeem.length,
        updated: bulkResult.modifiedCount,
        alreadyRedeemed: alreadyRedeemed.length,
        total: allTickets.length,
        tickets: updatedTickets
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en canje masivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Colocar / quitar la nota informativa en varios tickets a la vez
// (mismo checkbox de selección múltiple que el canje masivo, pero acá no
// importa si ya están canjeados o no: la información es independiente)
// @route   POST /api/tickets/bulk-informacion
// @access  Private (solo jefe)
const bulkMarcarInformacion = async (req, res) => {
  try {
    const { ticketIds, informacion } = req.body;
    const texto = (informacion || '').trim();

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un array de ticket IDs'
      });
    }

    const TicketModel = req.TicketModel || Ticket;
    const filtro = { 'Ticket ID': { $in: ticketIds } };

    const tickets = await TicketModel.find(filtro);
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron los tickets especificados'
      });
    }

    const updateOp = texto
      ? { $set: { informacion: texto, fechaInformacion: new Date(), colocadoInformacionPor: req.user._id } }
      : { $unset: { informacion: '', fechaInformacion: '', colocadoInformacionPor: '' } };

    await TicketModel.updateMany(filtro, updateOp);

    const actualizados = await TicketModel.find(filtro);

    const io = req.app.get('io');
    emitTicketUpdates(io, actualizados, texto ? 'informacion' : 'informacion-quitada');

    try {
      await AuditLog.create({
        tipo: 'informacion',
        usuario: req.user._id,
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: {
          accion: texto ? 'colocar_informacion_masivo' : 'quitar_informacion_masivo',
          informacion: texto,
          cantidad: actualizados.length,
          ticketIds: actualizados.map(t => t['Ticket ID'])
        },
        ip: req.ip || 'Unknown'
      });
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
    }

    res.json({
      success: true,
      message: texto
        ? `Información colocada en ${actualizados.length} ticket(s)`
        : `Información quitada de ${actualizados.length} ticket(s)`,
      data: { actualizados: actualizados.length }
    });

  } catch (error) {
    console.error('Error al colocar información masiva:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getTickets,
  printTicket,
  reprintTicket,
  getTicketsByTransaction,
  getTicketByBarcode,
  marcarFraude,
  marcarInformacion,
  getTicketStats,
  getReporteDiario,
  exportTicketsCsv,
  canjeTicket,
  bulkCanjeTickets,
  bulkMarcarInformacion
};
