const mongoose = require('mongoose');
require('dotenv').config();
const { getCollectionName } = require('../config/collectionName');

const createMissingIndexes = async () => {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const collectionName = getCollectionName();
    console.log(`📁 Colección: ${collectionName}`);
    const ticketsCollection = db.collection(collectionName);

    console.log('\n📊 Creando índices faltantes para mejor performance...\n');

    // Índice en campo Ticket (para búsquedas por localidad)
    console.log('1. Creando índice en campo "Ticket"...');
    await ticketsCollection.createIndex({ 'Ticket': 1 });
    console.log('   ✓ Índice en "Ticket" creado');

    // Índice en updatedAt (para check-changes)
    console.log('2. Creando índice en "updatedAt"...');
    await ticketsCollection.createIndex({ 'updatedAt': -1 });
    console.log('   ✓ Índice en "updatedAt" creado');

    // Índice compuesto Ticket + updatedAt (para check-changes con localidad)
    console.log('3. Creando índice compuesto "Ticket" + "updatedAt"...');
    await ticketsCollection.createIndex({ 'Ticket': 1, 'updatedAt': -1 });
    console.log('   ✓ Índice compuesto creado');

    // Listar todos los índices
    console.log('\n📋 Índices actuales en la colección:');
    const indexes = await ticketsCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ Todos los índices creados exitosamente');
    console.log('💡 Esto mejorará significativamente el rendimiento de las consultas\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando índices:', error);
    process.exit(1);
  }
};

createMissingIndexes();
