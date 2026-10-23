const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { selectCollection } = require('../middleware/collectionSelector');
const {
  getContador,
  incrementarContador,
  setContador
} = require('../controllers/contadorEntradasController');

router.use(selectCollection);

// Mismos roles que pueden escanear en /escanearTicket
const ROLES_ESCANEO = ['jefe', 'staff', 'impresor_solo', 'impresor_cola'];

// @route   GET /api/contador-entradas
router.get('/', auth, authorize(...ROLES_ESCANEO), getContador);

// @route   POST /api/contador-entradas/incrementar
router.post('/incrementar', auth, authorize(...ROLES_ESCANEO), incrementarContador);

// @route   PUT /api/contador-entradas (corrección manual o reinicio)
router.put('/', auth, authorize(...ROLES_ESCANEO), setContador);

module.exports = router;
