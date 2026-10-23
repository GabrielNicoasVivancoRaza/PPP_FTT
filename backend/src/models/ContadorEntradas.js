const mongoose = require('mongoose');
const { getEventCollectionName } = require('../config/collectionName');

// Documento único (singleton) con el contador de entradas leídas por el QR
// "quemado" (un único código fijo que no corresponde a ningún ticket real,
// usado para boletos que se imprimieron todos con el mismo QR). Vive en su
// propia colección para no mezclarse con los tickets reales.
const contadorEntradasSchema = new mongoose.Schema({
  contador: {
    type: Number,
    default: 0,
    min: 0
  },
  actualizadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Obtiene el documento único, creándolo si no existe
contadorEntradasSchema.statics.getOrCreate = async function() {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({ contador: 0 });
  }
  return doc;
};

// Un contador por evento (ver getEventCollectionName), separado de los tickets
module.exports = mongoose.model('ContadorEntradas', contadorEntradasSchema, getEventCollectionName('ContadorEntradas'));
