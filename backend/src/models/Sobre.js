const mongoose = require('mongoose');
const { getEventCollectionName } = require('../config/collectionName');

// Ubicación física de los boletos impresos, ordenados en sobres por nombre
// (proceso externo, ajeno a esta app). El join con los tickets es por
// nombre normalizado: no hay ningún ID en común entre este archivo y los
// tickets de SquadUp, así que la única forma de relacionarlos es el nombre
// de la persona.
//
// Un mismo evento puede tener varias localidades (p. ej. AREA y VIP), cada
// una con su propia tanda de sobres armada por separado — el mismo nombre
// (o el mismo bucket de nombres, tipo "Al") puede aparecer en más de una
// localidad con sobres distintos, así que la localidad es parte de la
// clave: nombre + localidad, no solo nombre.
//
// A veces el CSV de tickets usa más de un nombre de localidad para el MISMO
// lugar físico (p. ej. "CLUB AREA" y "CLUB AREA/DANCE FLOOR" son la misma
// zona con sobres distintos por nombre de ticket), así que un mismo archivo
// de sobres se puede subir marcado con VARIAS localidades a la vez.
//
// Se sube como CSV (ver sobresController.importarSobres), elige una o más
// localidades por archivo. Cada importación reemplaza lo anterior SOLO de
// las localidades elegidas — no afecta a las demás — porque el
// reordenamiento de sobres puede cambiar de una tanda a otra.
const sobreSchema = new mongoose.Schema({
  // Localidad(es) del ticket (campo "Ticket"/"Seat" del CSV de SquadUp) a
  // las que corresponde esta tanda de sobres. Un ticket matchea si SU
  // localidad está incluida en este array (ver buscarSobres).
  localidades: {
    type: [{ type: String, trim: true }],
    required: true,
    validate: {
      validator: v => Array.isArray(v) && v.length > 0,
      message: 'Debe tener al menos una localidad'
    },
    index: true
  },
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

// Búsqueda de "cuál es el sobre de esta persona en esta localidad"
sobreSchema.index({ localidades: 1, nombreNormalizado: 1 });

// Sobres separados por evento (ver getEventCollectionName)
module.exports = mongoose.model('Sobre', sobreSchema, getEventCollectionName('Sobres'));
