const PrintRequest = require('../models/PrintRequest');
const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');
const { markTransactionPrinted, emitTicketUpdates } = require('../utils/printHelpers');

// @desc    Crear (o extender) una solicitud de impresión pendiente para una transacción
// Uso interno, llamado desde ticketController tras un canje exitoso cuando el
// modo de impresión por cola está habilitado.
const createOrExtendPrintRequest = async ({ transactionId, ticketIds, tipos, color, puntoTrabajo, usuarioId, io }) => {
  let request = await PrintRequest.findOne({ transactionId, estado: 'pendiente' });

  if (request) {
    // Agregar tickets nuevos que no estén ya en la solicitud (canje parcial de la misma transacción)
    const nuevos = ticketIds.filter(id => !request.ticketIds.includes(id));
    if (nuevos.length > 0) {
      request.ticketIds.push(...nuevos);
      request.tipos = Array.from(new Set([...request.tipos, ...tipos]));
      request.color = request.tipos.length > 1 ? null : color;
      await request.save();
    }
  } else {
    request = await PrintRequest.create({
      transactionId,
      ticketIds,
      tipos,
      color: tipos.length > 1 ? null : color,
      puntoTrabajo,
      solicitadoPor: usuarioId,
      estado: 'pendiente'
    });
  }

  if (io) {
    io.to('impresores').emit('print-queue-updated', {
      action: 'nueva-solicitud',
      request,
      timestamp: new Date().toISOString()
    });
  }

  return request;
};

// @desc    Listar solicitudes de impresión por estado (pendiente/enviada/completada)
// @route   GET /api/print-requests
// @access  Private (jefe, impresor_cola)
const getQueue = async (req, res) => {
  try {
    const { estado = 'pendiente', page = 1, limit = 100 } = req.query;

    const query = {};
    if (estado !== 'todas') {
      query.estado = estado;
    }

    // Orden: pendientes por fecha de solicitud, enviadas por fecha de envío
    // (según se fueron mandando a imprimir), ambas ascendente (FIFO);
    // completadas (historial) más reciente primero
    let sort = { fechaSolicitud: 1 };
    if (estado === 'enviada') sort = { fechaEnvio: 1 };
    if (estado === 'completada') sort = { fechaImpresion: -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      PrintRequest.find(query)
        .populate('solicitadoPor', 'nombre usuario puntoTrabajo')
        .populate('enviadoPor', 'nombre usuario')
        .populate('impresoPor', 'nombre usuario')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      PrintRequest.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener cola de impresión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Enviar a imprimir una o varias solicitudes pendientes (lote por color)
// Paso 1 de 2: abre el link de SquadUp y pasa la solicitud a "enviada",
// esperando confirmación de que la impresión salió bien. Todavía NO marca
// los tickets como impresos.
// @route   POST /api/print-requests/send
// @access  Private (jefe, impresor_cola)
const sendToPrint = async (req, res) => {
  try {
    const { requestIds } = req.body;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un ID de solicitud'
      });
    }

    const now = new Date();
    const result = await PrintRequest.updateMany(
      { _id: { $in: requestIds }, estado: { $in: ['pendiente', 'enviada'] } },
      { $set: { estado: 'enviada', enviadoPor: req.user._id, fechaEnvio: now } }
    );

    const requests = await PrintRequest.find({ _id: { $in: requestIds } });
    const totalTickets = requests.reduce((sum, r) => sum + r.ticketIds.length, 0);

    const io = req.app.get('io');
    if (io) {
      io.to('impresores').emit('print-queue-updated', {
        action: 'enviada',
        requestIds: requests.map(r => r._id.toString()),
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `${result.modifiedCount} solicitud(es) enviada(s) a imprimir (${totalTickets} tickets)`,
      data: {
        transactionIds: requests.map(r => r.transactionId),
        ticketCount: totalTickets
      }
    });
  } catch (error) {
    console.error('Error al enviar a imprimir:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Confirmar que una o varias solicitudes se imprimieron correctamente
// Paso 2 de 2: marca los tickets de la transacción + tipo como impresos
// (propagando a toda la transacción) y mueve la solicitud a "completada"
// (pasa a la sección/página de Impresos).
// @route   POST /api/print-requests/confirm
// @access  Private (jefe, impresor_cola)
const confirmPrint = async (req, res) => {
  try {
    const { requestIds } = req.body;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un ID de solicitud'
      });
    }

    const requests = await PrintRequest.find({
      _id: { $in: requestIds },
      estado: { $in: ['enviada', 'pendiente'] }
    });

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron solicitudes enviadas con esos IDs'
      });
    }

    const now = new Date();
    const TicketModel = req.TicketModel || Ticket;

    // La impresión en SquadUp es por Transaction ID: propagar el estado
    // "impreso" a todos los tickets de esa transacción + tipo, no solo a
    // los que estaban explícitamente en la solicitud.
    const afectadosMap = new Map();
    for (const request of requests) {
      const tiposAProcesar = request.tipos && request.tipos.length > 0 ? request.tipos : [null];
      for (const tipo of tiposAProcesar) {
        const afectados = await markTransactionPrinted(TicketModel, request.transactionId, tipo, request.puntoTrabajo, now);
        afectados.forEach(t => afectadosMap.set(t['Ticket ID'], t));
      }
    }
    const updatedTickets = Array.from(afectadosMap.values());

    await PrintRequest.updateMany(
      { _id: { $in: requests.map(r => r._id) } },
      { $set: { estado: 'completada', impresoPor: req.user._id, fechaImpresion: now } }
    );

    const io = req.app.get('io');
    emitTicketUpdates(io, updatedTickets, 'impresion-cola');
    if (io) {
      io.to('impresores').emit('print-queue-updated', {
        action: 'completada',
        requestIds: requests.map(r => r._id.toString()),
        timestamp: new Date().toISOString()
      });
    }

    try {
      await AuditLog.create({
        tipo: 'impresion_cola',
        usuario: req.user._id,
        transactionId: requests.map(r => r.transactionId).join(', '),
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: {
          solicitudes: requests.length,
          transactionIds: requests.map(r => r.transactionId),
          ticketsImpresos: updatedTickets.length,
          colores: [...new Set(requests.map(r => r.color).filter(Boolean))]
        },
        ip: req.ip || 'Unknown'
      });
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
    }

    res.json({
      success: true,
      message: `${requests.length} solicitud(es) confirmada(s) como impresas (${updatedTickets.length} tickets)`,
      data: {
        transactionIds: requests.map(r => r.transactionId),
        ticketCount: updatedTickets.length
      }
    });
  } catch (error) {
    console.error('Error al confirmar impresión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  createOrExtendPrintRequest,
  getQueue,
  sendToPrint,
  confirmPrint
};
