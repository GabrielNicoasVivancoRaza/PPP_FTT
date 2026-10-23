const ContadorEntradas = require('../models/ContadorEntradas');

// @desc    Obtener el contador actual de entradas leídas por el QR fijo
// @route   GET /api/contador-entradas
// @access  Private
const getContador = async (req, res) => {
  try {
    const doc = await ContadorEntradas.getOrCreate();
    res.json({
      success: true,
      data: {
        contador: doc.contador,
        actualizadoPor: doc.actualizadoPor,
        updatedAt: doc.updatedAt
      }
    });
  } catch (error) {
    console.error('Error al obtener contador de entradas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Suma 1 al contador (atómico, para que varios dispositivos
// escaneando a la vez no se pisen entre sí)
// @route   POST /api/contador-entradas/incrementar
// @access  Private
const incrementarContador = async (req, res) => {
  try {
    const doc = await ContadorEntradas.findOneAndUpdate(
      {},
      { $inc: { contador: 1 }, $set: { actualizadoPor: req.user._id } },
      { new: true, upsert: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('contador-entradas-actualizado', {
        contador: doc.contador,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: { contador: doc.contador }
    });
  } catch (error) {
    console.error('Error al incrementar contador de entradas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Fija el contador a un valor exacto (corrección manual o reinicio a 0)
// @route   PUT /api/contador-entradas
// @access  Private
const setContador = async (req, res) => {
  try {
    const { contador } = req.body;

    if (typeof contador !== 'number' || !Number.isInteger(contador) || contador < 0) {
      return res.status(400).json({
        success: false,
        message: 'El contador debe ser un número entero mayor o igual a 0'
      });
    }

    const doc = await ContadorEntradas.findOneAndUpdate(
      {},
      { $set: { contador, actualizadoPor: req.user._id } },
      { new: true, upsert: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('contador-entradas-actualizado', {
        contador: doc.contador,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: { contador: doc.contador }
    });
  } catch (error) {
    console.error('Error al actualizar contador de entradas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getContador,
  incrementarContador,
  setContador
};
