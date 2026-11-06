const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { selectCollection } = require('../middleware/collectionSelector');
const { getSettings, updateRequiereEscaneoFisico } = require('../controllers/canjeSettingsController');

router.use(selectCollection);

// @route   GET /api/canje-settings
// Cualquiera que canjea necesita saber si hace falta escanear el boleto físico
router.get('/', auth, getSettings);

// @route   PUT /api/canje-settings
router.put('/', auth, authorize('jefe'), updateRequiereEscaneoFisico);

module.exports = router;
