const AuditLog = require('../models/AuditLog');

// @desc    Obtener logs de auditoría
// @route   GET /api/audit
// @access  Private (solo jefe)
const getAuditLogs = async (req, res) => {
  try {
    const { 
      tipo, 
      usuario, 
      ticketId,
      fechaInicio,
      fechaFin,
      page = 1, 
      limit = 50 
    } = req.query;

    const query = {};

    if (tipo) query.tipo = tipo;
    if (usuario) query.usuario = usuario;
    if (ticketId) query.ticketId = ticketId;

    if (fechaInicio || fechaFin) {
      query.createdAt = {};
      if (fechaInicio) {
        query.createdAt.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        query.createdAt.$lte = new Date(fechaFin);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('usuario', 'nombre usuario rol puntoTrabajo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error al obtener logs de auditoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener resumen de auditoría
// @route   GET /api/audit/summary
// @access  Private (solo jefe)
const getAuditSummary = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const matchQuery = {};
    if (fechaInicio || fechaFin) {
      matchQuery.createdAt = {};
      if (fechaInicio) {
        matchQuery.createdAt.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        matchQuery.createdAt.$lte = new Date(fechaFin);
      }
    }

    const [logsPorTipo, logsPorUsuario, logsPorDia] = await Promise.all([
      // Logs por tipo
      AuditLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$tipo",
            count: { $sum: 1 }
          }
        }
      ]),
      // Logs por usuario
      AuditLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$usuario",
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "usuario"
          }
        },
        {
          $unwind: "$usuario"
        },
        {
          $project: {
            count: 1,
            nombre: "$usuario.nombre",
            rol: "$usuario.rol"
          }
        },
        { $sort: { count: -1 } }
      ]),
      // Logs por día
      AuditLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      success: true,
      summary: {
        logsPorTipo,
        logsPorUsuario,
        logsPorDia
      }
    });

  } catch (error) {
    console.error('Error al obtener resumen de auditoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditSummary
};
