const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const { selectCollection } = require('../middleware/collectionSelector');
const { getActiveCollection } = require('../config/collections');
const {
  getTickets,
  printTicket,
  reprintTicket,
  getTicketsByTransaction,
  getTicketStats,
  canjeTicket,
  bulkCanjeTickets
} = require('../controllers/ticketController');

// Aplicar middleware de selección de colección a TODAS las rutas
router.use(selectCollection);

// @route   GET /api/tickets/active-collection
// @desc    Obtener información sobre la colección activa
router.get('/active-collection', auth, (req, res) => {
  try {
    const collectionInfo = getActiveCollection();
    res.json({
      success: true,
      data: {
        ...collectionInfo,
        current: req.activeCollection,
        all: req.activeCollections || [req.activeCollection]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo información de colección activa',
      error: error.message
    });
  }
});

// @route   GET /api/tickets
router.get('/', auth, getTickets);

// @route   GET /api/tickets/stats
router.get('/stats', auth, authorize('jefe'), getTicketStats);

// @route   GET /api/tickets/transaction/:transactionId
router.get('/transaction/:transactionId', auth, authorize('jefe'), getTicketsByTransaction);

// @route   POST /api/tickets/bulk-canje (DEBE IR ANTES DE RUTAS CON :id)
// Solo Jefe: el canje masivo es una operación de supervisión (ver acta de revisión de diseño, Semana 3)
router.post('/bulk-canje', auth, authorize('jefe'), auditLogger('canje_masivo'), bulkCanjeTickets);

// @route   POST /api/tickets/:id/print
router.post('/:id/print', auth, authorize('jefe', 'staff'), auditLogger('impresion'), printTicket);

// @route   POST /api/tickets/:id/reprint
router.post('/:id/reprint', auth, authorize('jefe'), auditLogger('reimpresion'), reprintTicket);

// @route   POST /api/tickets/:id/canje
router.post('/:id/canje', auth, authorize('jefe', 'staff'), auditLogger('canje'), canjeTicket);

module.exports = router;
