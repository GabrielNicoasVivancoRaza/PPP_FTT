const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  fecha: {
    type: String, // Formato: "2025-10-09"
    required: true,
    unique: true,
    index: true
  },
  colecciones: [{
    type: String,
    enum: ['FechaUno', 'FechaDos', 'FechaTres']
  }],
  // Mantener compatibilidad con sistema anterior (colección principal)
  coleccion: {
    type: String,
    enum: ['FechaUno', 'FechaDos', 'FechaTres']
  },
  activo: {
    type: Boolean,
    default: true
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  modificadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índice para búsqueda rápida por fecha
scheduleSchema.index({ fecha: 1, activo: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
