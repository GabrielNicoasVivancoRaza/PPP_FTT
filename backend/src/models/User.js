const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, necesitaPuntoTrabajo } = require('../utils/roles');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  usuario: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  // Se mantiene por compatibilidad con datos viejos (cuentas creadas antes
  // de soportar varios roles a la vez) y como "rol principal" (roles[0]).
  // No se edita a mano: el hook pre('validate') lo mantiene sincronizado
  // con "roles". El permiso real siempre se calcula sobre "roles" (ver
  // utils/roles.js), nunca sobre este campo directamente.
  rol: {
    type: String,
    enum: ROLES
  },
  // Un usuario puede tener más de un rol simultáneo (p. ej. "staff" +
  // "impresor_cola"): sus permisos son la unión de lo que cada uno habilita.
  roles: {
    type: [{ type: String, enum: ROLES }],
    required: true,
    validate: {
      validator: v => Array.isArray(v) && v.length > 0,
      message: 'Debe tener al menos un rol'
    }
  },
  puntoTrabajo: {
    type: String,
    required: function() {
      // Cuentas operativas globales (jefe, importador) no están atadas a
      // un punto de trabajo; si tiene además otro rol que sí lo necesita,
      // igual hace falta.
      const roles = (this.roles && this.roles.length) ? this.roles : (this.rol ? [this.rol] : []);
      return necesitaPuntoTrabajo(roles);
    },
    trim: true
  },
  primerAcceso: {
    type: Boolean,
    default: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      const roles = (this.roles && this.roles.length) ? this.roles : (this.rol ? [this.rol] : []);
      return !roles.includes('jefe');
    }
  }
}, {
  timestamps: true
});

// Compatibilidad hacia atrás: cuentas creadas antes de este cambio solo
// tienen "rol" (string único) guardado en Mongo, sin "roles". Al volver a
// guardar cualquiera de esas cuentas (activar/desactivar, editar, etc.) se
// completa "roles" desde el valor viejo; en el otro sentido, "rol" queda
// sincronizado con el primer rol de la lista para el código que todavía
// lo lea directamente.
userSchema.pre('validate', function(next) {
  if ((!this.roles || this.roles.length === 0) && this.rol) {
    this.roles = [this.rol];
  }
  if (this.roles && this.roles.length > 0) {
    this.rol = this.roles[0];
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema, 'Usuarios');
