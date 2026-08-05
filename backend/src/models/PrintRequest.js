const mongoose = require('mongoose');

// Solicitud de impresión generada cuando un staff canjea tickets y el modo
// de impresión por cola está habilitado. Agrupa por Transaction ID.
const printRequestSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    index: true
  },
  ticketIds: [{
    type: String,
    required: true
  }],
  tipos: [{
    type: String
  }],
  color: {
    type: String,
    default: null
  },
  // pendiente: esperando que el impresor la envíe a imprimir
  // enviada: se envió a SquadUp, esperando confirmación de que imprimió bien
  // completada: confirmada como impresa correctamente (aparece en Impresos)
  estado: {
    type: String,
    enum: ['pendiente', 'enviada', 'completada'],
    default: 'pendiente',
    index: true
  },
  puntoTrabajo: {
    type: String
  },
  solicitadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enviadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  impresoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fechaSolicitud: {
    type: Date,
    default: Date.now
  },
  fechaEnvio: {
    type: Date
  },
  fechaImpresion: {
    type: Date
  }
}, {
  timestamps: true
});

printRequestSchema.index({ estado: 1, color: 1 });
printRequestSchema.index({ transactionId: 1, estado: 1 });

module.exports = mongoose.model('PrintRequest', printRequestSchema, 'PrintRequests');
