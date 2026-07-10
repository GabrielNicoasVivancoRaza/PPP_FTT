const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB conectado');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  const Ticket = require('../models/Ticket');
  
  try {
    console.log('\n🔍 Creando índices para optimizar búsquedas...');
    
    // Índices para búsqueda de texto
    await Ticket.collection.createIndex({
      'First Name': 'text',
      'Last Name': 'text',
      'Email': 'text',
      'Seat': 'text',
      'Ticket ID': 'text',
      'Transaction ID': 'text',
      'Numero de Cedula:': 'text'
    });
    console.log('✅ Índice de texto creado');

    // Índices individuales para campos frecuentemente consultados
    await Ticket.collection.createIndex({ 'Ticket': 1 });
    console.log('✅ Índice en campo "Ticket" creado');
    
    await Ticket.collection.createIndex({ 'Seat': 1 });
    console.log('✅ Índice en campo "Seat" creado');
    
    await Ticket.collection.createIndex({ 'First Name': 1, 'Last Name': 1 });
    console.log('✅ Índice compuesto en nombres creado');
    
    await Ticket.collection.createIndex({ 'Email': 1 });
    console.log('✅ Índice en campo "Email" creado');
    
    await Ticket.collection.createIndex({ 'Ticket ID': 1 });
    console.log('✅ Índice en campo "Ticket ID" creado');
    
    await Ticket.collection.createIndex({ 'Transaction ID': 1 });
    console.log('✅ Índice en campo "Transaction ID" creado');

    // Listar todos los índices existentes
    const indexes = await Ticket.collection.indexes();
    console.log('\n📋 Índices existentes en la colección:');
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(index.key)}`);
    });

  } catch (error) {
    console.error('❌ Error creando índices:', error);
  }
};

const main = async () => {
  await connectDB();
  await createIndexes();
  
  console.log('\n✨ Optimización de índices completada');
  process.exit(0);
};

main();
