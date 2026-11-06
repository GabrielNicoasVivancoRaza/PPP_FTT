const mongoose = require('mongoose');
const { getEventCollectionName } = require('../config/collectionName');

// Documento único (singleton) con la configuración de validación del canje.
// Cuando "requiereEscaneoFisico" está activo, el canje individual exige
// escanear el código de barras/QR del boleto físico que se está entregando
// antes de confirmarse, y ese código tiene que coincidir con el ticket que
// se está canjeando (evita entregar el boleto equivocado).
const canjeSettingsSchema = new mongoose.Schema({
  requiereEscaneoFisico: {
    type: Boolean,
    default: false
  },
  actualizadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Obtiene el documento único de configuración, creándolo si no existe
canjeSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ requiereEscaneoFisico: false });
  }
  return settings;
};

// Una configuración de canje por evento (ver getEventCollectionName)
module.exports = mongoose.model('CanjeSettings', canjeSettingsSchema, getEventCollectionName('CanjeSettings'));
