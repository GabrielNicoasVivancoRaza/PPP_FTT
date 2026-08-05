const PrinterSettings = require('../models/PrinterSettings');
const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');

// @desc    Obtener configuración de impresión (habilitado + colores por tipo)
// @route   GET /api/printer-settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    const settings = await PrinterSettings.getSettings();
    res.json({
      success: true,
      data: {
        enabled: settings.enabled,
        ticketColors: settings.ticketColors
      }
    });
  } catch (error) {
    console.error('Error al obtener configuración de impresión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Habilitar/deshabilitar la función de impresión
// @route   PUT /api/printer-settings
// @access  Private (jefe)
const updateEnabled = async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El campo "enabled" es obligatorio y debe ser booleano'
      });
    }

    const settings = await PrinterSettings.getSettings();
    settings.enabled = enabled;
    settings.actualizadoPor = req.user._id;
    await settings.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('printer-settings-updated', {
        enabled: settings.enabled,
        ticketColors: settings.ticketColors,
        timestamp: new Date().toISOString()
      });
    }

    try {
      await AuditLog.create({
        tipo: 'config_impresion',
        usuario: req.user._id,
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: { accion: enabled ? 'habilitar_impresion' : 'deshabilitar_impresion' },
        ip: req.ip || 'Unknown'
      });
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
    }

    res.json({
      success: true,
      message: `Impresión ${enabled ? 'habilitada' : 'deshabilitada'} exitosamente`,
      data: {
        enabled: settings.enabled,
        ticketColors: settings.ticketColors
      }
    });
  } catch (error) {
    console.error('Error al actualizar configuración de impresión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener los tipos de ticket (campo "Ticket") detectados en la colección activa
// @route   GET /api/printer-settings/ticket-types
// @access  Private (jefe)
const getTicketTypes = async (req, res) => {
  try {
    const TicketModel = req.TicketModel || Ticket;
    const tipos = await TicketModel.distinct('Ticket');

    const tiposOrdenados = tipos
      .filter(t => t && t.trim())
      .map(t => t.trim())
      .sort();

    res.json({
      success: true,
      data: { tipos: tiposOrdenados }
    });
  } catch (error) {
    console.error('Error al obtener tipos de ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar el mapeo de colores por tipo de ticket
// @route   PUT /api/printer-settings/colors
// @access  Private (jefe)
const updateColors = async (req, res) => {
  try {
    const { ticketColors } = req.body;

    if (!Array.isArray(ticketColors)) {
      return res.status(400).json({
        success: false,
        message: 'ticketColors debe ser un arreglo de { tipo, color }'
      });
    }

    for (const entry of ticketColors) {
      if (!entry.tipo || !entry.color) {
        return res.status(400).json({
          success: false,
          message: 'Cada entrada debe tener "tipo" y "color"'
        });
      }
    }

    const settings = await PrinterSettings.getSettings();
    settings.ticketColors = ticketColors.map(({ tipo, color }) => ({
      tipo: tipo.trim(),
      color: color.trim()
    }));
    settings.actualizadoPor = req.user._id;
    await settings.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('printer-settings-updated', {
        enabled: settings.enabled,
        ticketColors: settings.ticketColors,
        timestamp: new Date().toISOString()
      });
    }

    try {
      await AuditLog.create({
        tipo: 'config_impresion',
        usuario: req.user._id,
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: { accion: 'actualizar_colores', ticketColors: settings.ticketColors },
        ip: req.ip || 'Unknown'
      });
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
    }

    res.json({
      success: true,
      message: 'Colores actualizados exitosamente',
      data: { ticketColors: settings.ticketColors }
    });
  } catch (error) {
    console.error('Error al actualizar colores:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getSettings,
  updateEnabled,
  getTicketTypes,
  updateColors
};
