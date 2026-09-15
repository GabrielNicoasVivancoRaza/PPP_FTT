const express = require('express');
const multer = require('multer');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { importarSobres, buscarSobres, getResumenSobres } = require('../controllers/sobresController');

// Multer en memoria: el CSV se procesa al vuelo, nunca se guarda en disco
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const esCSV = file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv');
    if (!esCSV) return cb(new Error('Solo se permiten archivos CSV'));
    cb(null, true);
  }
});

// @route   POST /api/sobres/import (reemplaza toda la información anterior)
router.post('/import', auth, authorize('jefe', 'importador'), uploadCsv.single('csv'), importarSobres);

// @route   GET /api/sobres/resumen
router.get('/resumen', auth, authorize('jefe', 'importador'), getResumenSobres);

// @route   POST /api/sobres/buscar  body: { nombres: string[] }
// Cualquier rol que hace canje/impresión necesita poder ubicar el sobre
router.post('/buscar', auth, authorize('jefe', 'staff', 'impresor_solo', 'impresor_cola'), buscarSobres);

module.exports = router;
