const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { selectCollection } = require('../middleware/collectionSelector');
const {
  getSettings,
  updateEnabled,
  getTicketTypes,
  updateColors
} = require('../controllers/printerSettingsController');

router.use(selectCollection);

// @route   GET /api/printer-settings
// Cualquier usuario autenticado necesita saber si la impresión está activa
router.get('/', auth, getSettings);

// @route   PUT /api/printer-settings
router.put('/', auth, authorize('jefe'), updateEnabled);

// @route   GET /api/printer-settings/ticket-types
router.get('/ticket-types', auth, authorize('jefe'), getTicketTypes);

// @route   PUT /api/printer-settings/colors
router.put('/colors', auth, authorize('jefe'), updateColors);

module.exports = router;
