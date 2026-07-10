require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('../src/models/Ticket');

async function listRealTickets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar tickets GENERAL que SÍ existen
    const tickets = await Ticket.find({ 
      Ticket: /GENERAL/i 
    }).limit(10).lean();

    console.log('📋 10 tickets GENERAL que SÍ existen en la base de datos:');
    console.log('='.repeat(80));
    
    tickets.forEach((t, i) => {
      console.log(`\n${i+1}. Ticket ID: ${t['Ticket ID']} (tipo de dato: ${typeof t['Ticket ID']})`);
      console.log(`   Nombre: ${t['First Name']} ${t['Last Name']}`);
      console.log(`   Transaction ID: ${t['Transaction ID']} (tipo: ${typeof t['Transaction ID']})`);
      console.log(`   Tipo de ticket: ${t.Ticket}`);
      console.log(`   Canjeado: ${t.canjeado ? 'SÍ' : 'NO'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 CONCLUSIÓN:');
    if (tickets.length > 0) {
      const firstTicket = tickets[0];
      console.log(`Los Ticket IDs están guardados como: ${typeof firstTicket['Ticket ID']}`);
      console.log(`Los Transaction IDs están guardados como: ${typeof firstTicket['Transaction ID']}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listRealTickets();
