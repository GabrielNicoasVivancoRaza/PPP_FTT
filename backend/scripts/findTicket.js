require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('../src/models/Ticket');

async function findSpecificTicket() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const ticketId = '15385500';
    console.log(`🔍 Buscando ticket con ID: "${ticketId}"`);
    console.log('='.repeat(80));
    
    const ticket = await Ticket.findOne({ 'Ticket ID': ticketId });
    
    if (ticket) {
      console.log('\n✅ ¡TICKET ENCONTRADO!');
      console.log(JSON.stringify(ticket, null, 2));
    } else {
      console.log('\n❌ TICKET NO ENCONTRADO en la base de datos');
      console.log('\n🔍 Buscando tickets similares...');
      
      // Buscar tickets con IDs similares
      const similarTickets = await Ticket.find({
        'Ticket ID': { $regex: '15385', $options: 'i' }
      }).limit(10);
      
      if (similarTickets.length > 0) {
        console.log(`\n📊 Se encontraron ${similarTickets.length} tickets con IDs similares:`);
        similarTickets.forEach(t => {
          console.log(`  - Ticket ID: "${t['Ticket ID']}", Nombre: ${t['First Name']} ${t['Last Name']}, Tipo: ${t.Ticket}`);
        });
      } else {
        console.log('\n❌ No hay tickets con IDs similares');
      }
      
      // Mostrar algunos tickets GENERAL que SÍ existen
      console.log('\n📋 Primeros 10 tickets GENERAL que SÍ existen:');
      const generalTickets = await Ticket.find({
        Ticket: { $regex: 'GENERAL', $options: 'i' }
      }).limit(10);
      
      generalTickets.forEach(t => {
        console.log(`  - ID: "${t['Ticket ID']}", Nombre: ${t['First Name']} ${t['Last Name']}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findSpecificTicket();
