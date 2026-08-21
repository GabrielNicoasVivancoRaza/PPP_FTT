const express = require('express');
const multer = require('multer');
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
  getTicketByBarcode,
  marcarFraude,
  marcarInformacion,
  getTicketStats,
  getReporteDiario,
  exportTicketsCsv,
  canjeTicket,
  bulkCanjeTickets,
  bulkMarcarInformacion
} = require('../controllers/ticketController');
const { importCsv, getTicketsEliminados, crearTicketManual } = require('../controllers/importController');

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

// @route   GET /api/tickets/reporte-diario?fecha=YYYY-MM-DD
router.get('/reporte-diario', auth, authorize('jefe'), getReporteDiario);

// @route   GET /api/tickets/export (descarga CSV con todos los tickets)
router.get('/export', auth, authorize('jefe'), exportTicketsCsv);

// @route   GET /api/tickets/transaction/:transactionId
// Habilitado para staff, impresor_solo e impresor_cola: necesitan saber
// cuántos tickets tiene asociados una transacción antes de canjear/imprimir
router.get('/transaction/:transactionId', auth, authorize('jefe', 'staff', 'impresor_solo', 'impresor_cola'), getTicketsByTransaction);

// @route   GET /api/tickets/barcode/:barcodeData
// Usado por el escáner (/escanearTicket) para todos los roles operativos
router.get('/barcode/:barcodeData', auth, authorize('jefe', 'staff', 'impresor_solo', 'impresor_cola'), getTicketByBarcode);

// @route   GET /api/tickets/eliminados
// Tickets que dejaron de aparecer en el CSV (anulados/reembolsados)
router.get('/eliminados', auth, authorize('jefe', 'importador'), getTicketsEliminados);

// @route   POST /api/tickets/manual (alta manual, queda como canjeado)
router.post('/manual', auth, authorize('jefe', 'importador'), crearTicketManual);

// @route   POST /api/tickets/:id/fraude (solo jefe)
router.post('/:id/fraude', auth, authorize('jefe'), marcarFraude);

// @route   POST /api/tickets/:id/informacion (solo jefe)
router.post('/:id/informacion', auth, authorize('jefe'), marcarInformacion);

// @route   POST /api/tickets/import-csv
// Sube el CSV del evento tal cual; el backend filtra columnas y agrega
// solo los tickets que todavía no existan (no toca los ya existentes)
router.post('/import-csv', auth, authorize('jefe', 'importador'), uploadCsv.single('csv'), importCsv);

// @route   POST /api/tickets/bulk-canje (DEBE IR ANTES DE RUTAS CON :id)
// Jefe, Staff e impresor_solo pueden realizar canje masivo.
// Nota: bulkCanjeTickets ya registra su propio log de auditoría (con ticketId/detalles/ip completos),
// por lo que NO se usa auditLogger aquí para evitar duplicar el registro en Auditoría.
router.post('/bulk-canje', auth, authorize('jefe', 'staff', 'impresor_solo'), bulkCanjeTickets);

// @route   POST /api/tickets/bulk-informacion (solo jefe)
router.post('/bulk-informacion', auth, authorize('jefe'), bulkMarcarInformacion);

// @route   POST /api/tickets/:id/print
router.post('/:id/print', auth, authorize('jefe', 'staff', 'impresor_solo'), auditLogger('impresion'), printTicket);

// @route   POST /api/tickets/:id/reprint
router.post('/:id/reprint', auth, authorize('jefe', 'impresor_solo', 'impresor_cola'), auditLogger('reimpresion'), reprintTicket);

// @route   POST /api/tickets/:id/canje
// Nota: canjeTicket ya registra su propio log de auditoría (con ticketId/detalles/ip completos),
// por lo que NO se usa auditLogger aquí para evitar duplicar el registro en Auditoría.
router.post('/:id/canje', auth, authorize('jefe', 'staff', 'impresor_solo'), canjeTicket);

module.exports = router;
