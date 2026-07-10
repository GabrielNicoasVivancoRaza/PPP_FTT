const mongoose = require('mongoose');
require('dotenv').config();
const axios = require('axios');

async function test() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a BD');
    
    const Ticket = require('../src/models/Ticket');
    
    // Obtener conteo de tickets
    const count = await Ticket.countDocuments();
    console.log(`📊 Tickets en BD: ${count}`);
    
    // Probar query simple
    const tickets = await Ticket.find().limit(5).lean();
    console.log(`\n✅ Query directa funciona:`);
    console.log(`   - Encontrados: ${tickets.length} tickets`);
    if (tickets.length > 0) {
      console.log(`   - Ejemplo: ${tickets[0]['First Name']} ${tickets[0]['Last Name']} - Seat: ${tickets[0].Seat}`);
    }
    
    // Probar con búsqueda de números
    const searchTickets = await Ticket.find({ 'Ticket ID': 17237508 }).lean();
    console.log(`\n✅ Búsqueda por Ticket ID funciona:`);
    console.log(`   - Encontrados: ${searchTickets.length}`);
    
    await mongoose.disconnect();
    console.log('\n✅ TEST COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
