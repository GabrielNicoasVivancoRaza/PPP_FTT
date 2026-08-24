const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hasAnyRole } = require('../utils/roles');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token, autorización denegada' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.activo) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no válido' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token no válido' 
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
    }

    // Aplanar el array de roles en caso de que sea un array anidado
    const flatRoles = roles.flat();

    // Un usuario puede tener más de un rol: alcanza con que UNO de los
    // suyos esté en la lista permitida para esta ruta.
    if (!hasAnyRole(req.user, flatRoles)) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tiene permisos para realizar esta acción' 
      });
    }

    next();
  };
};

module.exports = { auth, authorize };
