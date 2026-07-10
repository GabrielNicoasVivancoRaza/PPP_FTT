const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getAuditLogs,
  getAuditSummary
} = require('../controllers/auditController');

// @route   GET /api/audit
router.get('/', auth, authorize('jefe'), getAuditLogs);

// @route   GET /api/audit/summary
router.get('/summary', auth, authorize('jefe'), getAuditSummary);

module.exports = router;
