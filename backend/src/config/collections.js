const mongoose = require('mongoose');

// Colección única para Lumineers
const defaultCollection = process.env.COLLECTION_NAME || 'Lumineers_Canje';

// Obtener modelo de Ticket para la colección
const getTicketModel = () => {
  // Obtener el schema de Ticket
  const ticketSchema = require('../models/Ticket').schema;
  
  // Si ya existe el modelo, retornarlo
  if (mongoose.models[defaultCollection]) {
    return mongoose.models[defaultCollection];
  }
  
  // Crear nuevo modelo con la colección
  return mongoose.model(defaultCollection, ticketSchema, defaultCollection);
};

// Retornar información de la colección activa
const getActiveCollection = () => {
  return {
    active: defaultCollection,
    available: [defaultCollection],
    multiple: false
  };
};

module.exports = {
  defaultCollection,
  getTicketModel,
  getActiveCollection
};
