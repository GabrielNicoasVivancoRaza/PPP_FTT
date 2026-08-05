const mongoose = require('mongoose');

// Documento único (singleton) con la configuración global de impresión
const printerSettingsSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false
  },
  ticketColors: [{
    tipo: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      required: true,
      trim: true
    }
  }],
  actualizadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Obtiene el documento único de configuración, creándolo si no existe
printerSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ enabled: false, ticketColors: [] });
  }
  return settings;
};

module.exports = mongoose.model('PrinterSettings', printerSettingsSchema, 'PrinterSettings');
