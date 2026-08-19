const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  hardDeleteUser
} = require('../controllers/userController');

// @route   POST /api/users
router.post('/', auth, authorize('jefe'), auditLogger('creacion_usuario'), createUser);

// @route   GET /api/users
router.get('/', auth, authorize('jefe'), getUsers);

// @route   PUT /api/users/:id
router.put('/:id', auth, authorize('jefe'), updateUser);

// @route   DELETE /api/users/:id (desactiva, no borra de la BD)
router.delete('/:id', auth, authorize('jefe'), deleteUser);

// @route   DELETE /api/users/:id/permanent (borra el documento de la BD)
router.delete('/:id/permanent', auth, authorize('jefe'), hardDeleteUser);

module.exports = router;
