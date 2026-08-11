const mongoose = require('mongoose');
const { getCollectionName } = require('../config/collectionName');

const ticketSchema = new mongoose.Schema({
  'First Name': {
    type: String,
    required: true,
    trim: true
  },
  'Last Name': {
    type: String,
    required: true,
    trim: true
  },
  'Email': {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  'Ticket': {
    type: String,
    required: true
  },
  'Seat': {
    type: String,
    required: true
  },
  'Transaction ID': {
    type: String,
    required: true,
    index: true
  },
  'Ticket ID': {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  'Numero de Cedula:': {
    type: String,
    trim: true,
    default: ''
  },
  // Campos de control de impresión
  impreso: {
    type: Boolean,
    default: false
  },
  fechaImpresion: {
    type: Date
  },
  usuarioResponsable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  puntoTrabajo: {
    type: String
  },
  // Campos del formulario de impresión/canje
  quienRetira: {
    type: String,
    enum: ['Titular', 'Titular Compra', 'Otro'],
    trim: true
  },
  quienOtro: {
    type: String,
    trim: true,
    // Solo requerido cuando quienRetira === 'Otro'
    validate: {
      validator: function(v) {
        // Si quienRetira es 'Otro', entonces quienOtro debe tener valor
        if (this.quienRetira === 'Otro') {
          return v && v.length > 0;
        }
        return true; // No es requerido para otros casos
      },
      message: 'Debe especificar el nombre cuando selecciona "Otro"'
    }
  },
  parentesco: {
    type: String,
    trim: true,
    enum: ['Esposo/a', 'Hijo/a', 'Padre/Madre', 'Hermano/a', 'Amigo/a', 'Otro parentesco', ''],
    // Solo requerido cuando quienRetira === 'Otro'
    validate: {
      validator: function(v) {
        // Si quienRetira es 'Otro', entonces parentesco debe tener valor
        if (this.quienRetira === 'Otro') {
          return v && v.length > 0;
        }
        return true; // No es requerido para otros casos
      },
      message: 'Debe especificar el parentesco cuando selecciona "Otro"'
    }
  },
  celular: {
    type: String,
    trim: true,
    required: function() {
      // Celular es requerido si hay información de retiro
      return this.quienRetira && this.quienRetira.length > 0;
    }
  },
  // Campos de control de canje
  canjeado: {
    type: Boolean,
    default: false
  },
  fechaCanje: {
    type: Date
  },
  usuarioCanje: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  puntoCanje: {
    type: String
  },
  // Control de reimpresiones
  reimpresiones: [{
    fecha: {
      type: Date,
      default: Date.now
    },
    motivo: {
      type: String,
      required: true
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    puntoTrabajo: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Índices compuestos para mejorar búsquedas
ticketSchema.index({ 'First Name': 1, 'Last Name': 1 });
ticketSchema.index({ 'Email': 1 });
ticketSchema.index({ 'Seat': 1 });
ticketSchema.index({ 'Numero de Cedula:': 1 });
ticketSchema.index({ 'Transaction ID': 1, 'Ticket ID': 1 });
ticketSchema.index({ 'Ticket': 1 }); // Para búsqueda por localidad - MUY IMPORTANTE
ticketSchema.index({ impreso: 1, puntoTrabajo: 1 });
ticketSchema.index({ canjeado: 1, puntoTrabajo: 1 });
ticketSchema.index({ updatedAt: -1 }); // Para check-changes - CRÍTICO para performance
ticketSchema.index({ 'Ticket': 1, updatedAt: -1 }); // Compuesto para check-changes con localidad

// La colección sale de COLLECTION_NAME (ver config/collectionName.js), nunca
// de un nombre fijo en el código: así renombrar o cambiar de colección es
// solo cambiar la variable de entorno.
module.exports = mongoose.model('Ticket', ticketSchema, getCollectionName());
