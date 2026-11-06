const CanjeSettings = require('../models/CanjeSettings');
const AuditLog = require('../models/AuditLog');

// @desc    Obtener configuración de validación de canje (escaneo físico obligatorio)
// @route   GET /api/canje-settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    const settings = await CanjeSettings.getSettings();
    res.json({
      success: true,
      data: {
        requiereEscaneoFisico: settings.requiereEscaneoFisico
      }
    });
  } catch (error) {
    console.error('Error al obtener configuración de canje:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Habilitar/deshabilitar la exigencia de escanear el boleto físico
// al momento de canjear (solo canje individual, no masivo)
// @route   PUT /api/canje-settings
// @access  Private (jefe)
const updateRequiereEscaneoFisico = async (req, res) => {
  try {
    const { requiereEscaneoFisico } = req.body;

    if (typeof requiereEscaneoFisico !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El campo "requiereEscaneoFisico" es obligatorio y debe ser booleano'
      });
    }

    const settings = await CanjeSettings.getSettings();
    settings.requiereEscaneoFisico = requiereEscaneoFisico;
    settings.actualizadoPor = req.user._id;
    await settings.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('canje-settings-updated', {
        requiereEscaneoFisico: settings.requiereEscaneoFisico,
        timestamp: new Date().toISOString()
      });
    }

    try {
      await AuditLog.create({
        tipo: 'config_canje',
        usuario: req.user._id,
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: {
          accion: requiereEscaneoFisico ? 'activar_validacion_escaneo_canje' : 'desactivar_validacion_escaneo_canje'
        },
        ip: req.ip || 'Unknown'
      });
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
    }

    res.json({
      success: true,
      message: requiereEscaneoFisico
        ? 'Ahora el canje individual exige escanear el boleto físico'
        : 'El canje ya no exige escanear el boleto físico',
      data: { requiereEscaneoFisico: settings.requiereEscaneoFisico }
    });
  } catch (error) {
    console.error('Error al actualizar configuración de canje:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = { getSettings, updateRequiereEscaneoFisico };
