const mongoose = require('mongoose');
const { getEventCollectionName } = require('../config/collectionName');

const auditLogSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: ['impresion', 'reimpresion', 'impresion_cola', 'config_impresion', 'canje', 'canje_masivo', 'canje_deshecho', 'importacion_csv', 'fraude', 'informacion', 'ticket_manual', 'tickets_eliminados', 'login', 'logout', 'creacion_usuario', 'cambio_password', 'eliminacion_permanente']
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketId: {
    type: String,
    index: true
  },
  transactionId: {
    type: String,
    index: true
  },
  puntoTrabajo: {
    type: String
  },
  detalles: {
    type: mongoose.Schema.Types.Mixed
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Índices para mejorar consultas de auditoría
auditLogSchema.index({ tipo: 1, createdAt: -1 });
auditLogSchema.index({ usuario: 1, createdAt: -1 });
auditLogSchema.index({ ticketId: 1, tipo: 1 });

// Una colección de auditoría por evento (ver getEventCollectionName): así
// dos eventos corriendo sobre el mismo MONGODB_URI no se mezclan los logs
module.exports = mongoose.model('AuditLog', auditLogSchema, getEventCollectionName('AuditLog'));
