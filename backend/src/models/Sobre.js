const mongoose = require('mongoose');
const { getEventCollectionName } = require('../config/collectionName');

// Ubicación física de los boletos impresos, ordenados en sobres por nombre
// (proceso externo, ajeno a esta app). El join con los tickets es por
// nombre normalizado: no hay ningún ID en común entre este archivo y los
// tickets de SquadUp, así que la única forma de relacionarlos es el nombre
// de la persona.
//
// Se sube como CSV (ver sobresController.importarSobres) y CADA importación
// reemplaza TODO lo anterior — no se mezcla con datos de una subida vieja,
// porque el reordenamiento de sobres puede cambiar de una tanda a otra.
const sobreSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  // Nombre en mayúsculas y sin tildes, para poder buscar sin depender de
  // que la persona que canjea escriba/reciba el nombre exactamente igual
  nombreNormalizado: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  sobre: {
    type: String,
    required: true,
    trim: true
  },
  numeroBoleto: {
    type: String,
    trim: true
  },
  posicionOriginal: {
    type: String,
    trim: true
  },
  subidoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Sobres separados por evento (ver getEventCollectionName)
module.exports = mongoose.model('Sobre', sobreSchema, getEventCollectionName('Sobres'));
