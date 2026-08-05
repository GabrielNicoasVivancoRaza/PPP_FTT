const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { selectCollection } = require('../middleware/collectionSelector');
const { getQueue, sendToPrint, confirmPrint } = require('../controllers/printRequestController');

router.use(selectCollection);

// @route   GET /api/print-requests
router.get('/', auth, authorize('jefe', 'impresor_cola'), getQueue);

// @route   POST /api/print-requests/send (paso 1: enviar a imprimir)
router.post('/send', auth, authorize('jefe', 'impresor_cola'), sendToPrint);

// @route   POST /api/print-requests/confirm (paso 2: confirmar impresión correcta)
router.post('/confirm', auth, authorize('jefe', 'impresor_cola'), confirmPrint);

module.exports = router;
