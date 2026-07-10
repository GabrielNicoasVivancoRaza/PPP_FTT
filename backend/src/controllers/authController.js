const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Generar JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '8h'
  });
};

// @desc    Login de usuario
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const user = await User.findOne({ usuario }).select('+password');
    
    if (!user || !user.activo) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Crear log de auditoría
    await AuditLog.create({
      tipo: 'login',
      usuario: user._id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      puntoTrabajo: user.puntoTrabajo
    });

    // Generar token
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
        puntoTrabajo: user.puntoTrabajo,
        primerAcceso: user.primerAcceso
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Cambiar contraseña (primer acceso o cambio normal)
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // Verificar contraseña actual solo si no es primer acceso
    if (!user.primerAcceso) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual es requerida'
        });
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }
    }

    // Actualizar contraseña
    user.password = newPassword;
    user.primerAcceso = false;
    await user.save();

    // Crear log de auditoría
    await AuditLog.create({
      tipo: 'cambio_password',
      usuario: user._id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      detalles: { primerAcceso: req.user.primerAcceso }
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Logout de usuario
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Crear log de auditoría
    await AuditLog.create({
      tipo: 'logout',
      usuario: req.user._id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      puntoTrabajo: req.user.puntoTrabajo
    });

    res.json({
      success: true,
      message: 'Logout exitoso'
    });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener perfil de usuario
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  login,
  changePassword,
  logout,
  getProfile
};
