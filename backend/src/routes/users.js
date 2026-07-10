const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser
} = require('../controllers/userController');

// @route   POST /api/users
router.post('/', auth, authorize('jefe'), auditLogger('creacion_usuario'), createUser);

// @route   GET /api/users
router.get('/', auth, authorize('jefe'), getUsers);

// @route   PUT /api/users/:id
router.put('/:id', auth, authorize('jefe'), updateUser);

// @route   DELETE /api/users/:id
router.delete('/:id', auth, authorize('jefe'), deleteUser);

module.exports = router;
