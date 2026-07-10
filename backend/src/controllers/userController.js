const User = require('../models/User');

// @desc    Crear nuevo usuario
// @route   POST /api/users
// @access  Private (solo jefe)
const createUser = async (req, res) => {
  try {
    const { nombre, usuario, rol, puntoTrabajo } = req.body;

    if (!nombre || !usuario || !rol) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, usuario y rol son requeridos'
      });
    }

    if ((rol === 'staff' || rol === 'impresor') && !puntoTrabajo) {
      return res.status(400).json({
        success: false,
        message: 'Punto de trabajo es requerido para staff e impresor'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ usuario });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe'
      });
    }

    // Crear usuario con contraseña por defecto
    const newUser = new User({
      nombre,
      usuario,
      password: process.env.DEFAULT_PASSWORD,
      rol,
      puntoTrabajo: rol !== 'jefe' ? puntoTrabajo : undefined,
      creadoPor: req.user._id,
      primerAcceso: true
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: newUser
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private (solo jefe)
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ activo: true })
      .populate('creadoPor', 'nombre usuario')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar usuario
// @route   PUT /api/users/:id
// @access  Private (solo jefe)
const updateUser = async (req, res) => {
  try {
    const { nombre, puntoTrabajo, activo } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir desactivar al usuario logueado
    if (userId === req.user._id.toString() && activo === false) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta'
      });
    }

    if (nombre) user.nombre = nombre;
    if (puntoTrabajo && user.rol !== 'jefe') user.puntoTrabajo = puntoTrabajo;
    if (typeof activo === 'boolean') user.activo = activo;

    await user.save();

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Eliminar usuario (desactivar)
// @route   DELETE /api/users/:id
// @access  Private (solo jefe)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.activo = false;
    await user.save();

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser
};
