const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  login,
  changePassword,
  logout,
  getProfile
} = require('../controllers/authController');

// @route   POST /api/auth/login
router.post('/login', login);

// Nota: changePassword y logout ya registran su propio log de auditoría
// (ver authController.js), por lo que NO se usa auditLogger aquí para
// evitar duplicar el registro en Auditoría.

// @route   POST /api/auth/change-password
router.post('/change-password', auth, changePassword);

// @route   POST /api/auth/logout
router.post('/logout', auth, logout);

// @route   GET /api/auth/profile
router.get('/profile', auth, getProfile);

module.exports = router;
