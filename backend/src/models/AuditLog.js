const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: ['impresion', 'reimpresion', 'canje', 'canje_masivo', 'login', 'logout', 'creacion_usuario', 'cambio_password']
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

module.exports = mongoose.model('AuditLog', auditLogSchema);
