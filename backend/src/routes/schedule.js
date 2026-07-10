const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getSchedule,
  setSchedule,
  deleteSchedule,
  getActiveSchedule,
  getCollections
} = require('../controllers/scheduleController');

// @route   GET /api/schedule/collections
// @desc    Obtener información de todas las colecciones disponibles
// @access  Private
router.get('/collections', auth, getCollections);

// @route   GET /api/schedule/active
// @desc    Obtener colección activa para una fecha
// @access  Private
router.get('/active', auth, getActiveSchedule);

// @route   GET /api/schedule
// @desc    Obtener cronograma completo
// @access  Private (Jefe)
router.get('/', auth, authorize('jefe'), getSchedule);

// @route   POST /api/schedule
// @desc    Crear/Actualizar asignación de fechas
// @access  Private (Jefe)
router.post('/', auth, authorize('jefe'), setSchedule);

// @route   DELETE /api/schedule
// @desc    Eliminar asignación de fechas
// @access  Private (Jefe)
router.delete('/', auth, authorize('jefe'), deleteSchedule);

module.exports = router;
