const Schedule = require('../models/Schedule');
const { getCollectionsInfo } = require('../config/collections');
const { getEcuadorDateString } = require('../utils/ecuadorTime');

// @desc    Obtener cronograma completo
// @route   GET /api/schedule
// @access  Private (Jefe)
const getSchedule = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    
    // Filtrar por rango de fechas si se proporciona
    if (startDate || endDate) {
      query.fecha = {};
      if (startDate) query.fecha.$gte = startDate;
      if (endDate) query.fecha.$lte = endDate;
    }
    
    const schedules = await Schedule.find(query)
      .populate('creadoPor', 'nombre usuario')
      .populate('modificadoPor', 'nombre usuario')
      .sort({ fecha: 1 });
    
    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error obteniendo cronograma:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cronograma'
    });
  }
};

// @desc    Crear/Actualizar asignación de fecha(s) a colección(es)
// @route   POST /api/schedule
// @access  Private (Jefe)
const setSchedule = async (req, res) => {
  try {
    const { fechas, coleccion, colecciones } = req.body;
    
    // Validaciones
    if (!fechas || !Array.isArray(fechas) || fechas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos una fecha'
      });
    }
    
    // Puede ser coleccion (singular) o colecciones (múltiples)
    const colsToAssign = colecciones || (coleccion ? [coleccion] : []);
    
    if (colsToAssign.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos una colección'
      });
    }
    
    // Validar que todas las colecciones sean válidas
    const validCollections = ['FechaUno', 'FechaDos', 'FechaTres'];
    const invalidCols = colsToAssign.filter(c => !validCollections.includes(c));
    if (invalidCols.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Colecciones inválidas: ${invalidCols.join(', ')}`
      });
    }
    
    const results = [];
    
    // Procesar cada fecha
    for (const fecha of fechas) {
      try {
        // Validar formato de fecha (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
          results.push({
            fecha,
            success: false,
            message: 'Formato de fecha inválido'
          });
          continue;
        }
        
        // Upsert: crear si no existe, actualizar si existe
        const schedule = await Schedule.findOneAndUpdate(
          { fecha },
          {
            colecciones: colsToAssign,
            coleccion: colsToAssign[0], // Mantener compatibilidad (primera colección como principal)
            activo: true,
            modificadoPor: req.user._id,
            $setOnInsert: { creadoPor: req.user._id }
          },
          { 
            upsert: true,
            new: true,
            runValidators: true
          }
        );
        
        results.push({
          fecha,
          success: true,
          data: schedule
        });
      } catch (error) {
        results.push({
          fecha,
          success: false,
          message: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `${results.filter(r => r.success).length} fechas asignadas correctamente`,
      data: results
    });
  } catch (error) {
    console.error('Error asignando cronograma:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar cronograma'
    });
  }
};

// @desc    Eliminar asignación de fecha(s)
// @route   DELETE /api/schedule
// @access  Private (Jefe)
const deleteSchedule = async (req, res) => {
  try {
    const { fechas } = req.body;
    
    if (!fechas || !Array.isArray(fechas) || fechas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos una fecha'
      });
    }
    
    const result = await Schedule.deleteMany({
      fecha: { $in: fechas }
    });
    
    res.json({
      success: true,
      message: `${result.deletedCount} fechas eliminadas`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error('Error eliminando cronograma:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar cronograma'
    });
  }
};

// @desc    Obtener colección activa para una fecha específica
// @route   GET /api/schedule/active
// @access  Private
const getActiveSchedule = async (req, res) => {
  try {
    const { fecha } = req.query;
    // Si no se proporciona fecha, usar la fecha actual de Ecuador
    const targetDate = fecha || getEcuadorDateString();
    
    const schedule = await Schedule.findOne({
      fecha: targetDate,
      activo: true
    });
    
    res.json({
      success: true,
      data: {
        fecha: targetDate,
        coleccion: schedule ? schedule.coleccion : 'FechaUno',
        schedule: schedule || null
      }
    });
  } catch (error) {
    console.error('Error obteniendo schedule activo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener schedule activo'
    });
  }
};

// @desc    Obtener información de todas las colecciones disponibles
// @route   GET /api/schedule/collections
// @access  Private
const getCollections = async (req, res) => {
  try {
    const collectionsInfo = getCollectionsInfo();
    
    res.json({
      success: true,
      data: collectionsInfo
    });
  } catch (error) {
    console.error('Error obteniendo colecciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener colecciones'
    });
  }
};

module.exports = {
  getSchedule,
  setSchedule,
  deleteSchedule,
  getActiveSchedule,
  getCollections
};
