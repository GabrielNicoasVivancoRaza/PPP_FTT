const { getCollectionName } = require('./collectionName');

// El nombre de la colección activa sale siempre de COLLECTION_NAME.
// No hay nombres hardcodeados aquí: cambiar de colección es cambiar esa
// variable de entorno.

// Modelo de Ticket de la colección activa.
// Devuelve el MISMO modelo que models/Ticket.js (ambos se construyen con
// getCollectionName()), de modo que es imposible que una parte del código
// lea de una colección y otra escriba en otra distinta.
const getTicketModel = () => require('../models/Ticket');

// Información de la colección activa
const getActiveCollection = () => {
  const active = getCollectionName();
  return {
    active,
    available: [active],
    multiple: false
  };
};

module.exports = {
  getCollectionName,
  getTicketModel,
  getActiveCollection
};
