const mongoose = require('mongoose');
const { getEventCollectionName } = require('../config/collectionName');

const puntoVentaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  localidades: [{
    type: String,
    required: true
    // Las localidades se extraen dinámicamente del CSV (columna Seat)
    // No hay validación enum, viene directamente de los datos
  }],
  activo: {
    type: Boolean,
    default: true
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices
puntoVentaSchema.index({ nombre: 1 });
puntoVentaSchema.index({ activo: 1 });

// Un juego de puntos de venta por evento (ver getEventCollectionName)
module.exports = mongoose.model('PuntoVenta', puntoVentaSchema, getEventCollectionName('PuntosVenta'));
