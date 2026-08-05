const express = require('express');
const router = express.Router();
const {
  getPuntosVenta,
  createPuntoVenta,
  updatePuntoVenta,
  deletePuntoVenta,
  getTicketsByPuntoVenta,
  getEstadisticasPuntoVenta,
  getTicketsForStaff,
  checkTicketsChanges,
  checkTicketsChangesForStaff,
  getLocalidadesDisponibles
} = require('../controllers/puntoVentaController');
const { auth, authorize } = require('../middleware/auth');
const { selectCollection } = require('../middleware/collectionSelector');

// Usar la misma colección activa que /api/tickets (evita divergencia de datos
// entre ambos routers, ver Día 44 de evidencias de pasantía)
router.use(selectCollection);

// Ruta para obtener localidades disponibles (para seleccionar en formulario)
router.get('/localidades/disponibles', auth, getLocalidadesDisponibles);

// Ruta especial para staff - tickets de su punto de trabajo
// impresor_solo también usa esta ruta porque opera igual que staff, con impresión incluida
router.get('/staff/tickets', auth, authorize('staff', 'impresor_solo'), getTicketsForStaff);
router.get('/staff/tickets/check-changes', auth, authorize('staff', 'impresor_solo'), checkTicketsChangesForStaff);

// Rutas principales
router.route('/')
  .get(auth, getPuntosVenta)
  .post(auth, authorize('jefe'), createPuntoVenta);

router.route('/:id')
  .put(auth, authorize('jefe'), updatePuntoVenta)
  .delete(auth, authorize('jefe'), deletePuntoVenta);

// Rutas específicas
router.get('/:id/tickets', auth, getTicketsByPuntoVenta);
router.get('/:id/tickets/check-changes', auth, checkTicketsChanges);
router.get('/:id/estadisticas', auth, getEstadisticasPuntoVenta);

module.exports = router;
