const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const {
  login,
  changePassword,
  logout,
  getProfile
} = require('../controllers/authController');

// @route   POST /api/auth/login
router.post('/login', login);

// @route   POST /api/auth/change-password
router.post('/change-password', auth, auditLogger('cambio_password'), changePassword);

// @route   POST /api/auth/logout
router.post('/logout', auth, auditLogger('logout'), logout);

// @route   GET /api/auth/profile
router.get('/profile', auth, getProfile);

module.exports = router;
