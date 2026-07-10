const mongoose = require('mongoose');
require('dotenv').config();

const Ticket = require('../src/models/Ticket');

async function checkTicketIDs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar tickets sin Ticket ID o con Ticket ID vacío
    const ticketsSinID = await Ticket.find({
      $or: [
        { 'Ticket ID': { $exists: false } },
        { 'Ticket ID': null },
        { 'Ticket ID': '' }
      ]
    }).limit(10);

    console.log('\n📊 Tickets sin Ticket ID:');
    console.log('Total:', ticketsSinID.length);
    
    if (ticketsSinID.length > 0) {
      console.log('\nPrimeros 10:');
      ticketsSinID.forEach(t => {
        console.log(`- ${t['First Name']} ${t['Last Name']} - Ticket ID: "${t['Ticket ID']}" - _id: ${t._id}`);
      });
    }

    // Verificar algunos IDs específicos de tu error
    const idsToCheck = ['15397187', '15397202', '15397225', '15397238', '15397474'];
    
    console.log('\n🔍 Verificando IDs específicos del error:');
    for (const id of idsToCheck) {
      const ticket = await Ticket.findOne({ 'Ticket ID': id });
      if (ticket) {
        console.log(`✅ ${id} - ENCONTRADO - ${ticket['First Name']} ${ticket['Last Name']}`);
      } else {
        console.log(`❌ ${id} - NO ENCONTRADO`);
        
        // Buscar variaciones solo por Ticket ID
        const variations = await Ticket.find({
          'Ticket ID': { $regex: id, $options: 'i' }
        }).limit(3);
        
        if (variations.length > 0) {
          console.log(`   📝 Posibles coincidencias:`);
          variations.forEach(v => {
            console.log(`      - Ticket ID: "${v['Ticket ID']}" (_id: ${v._id})`);
          });
        }
      }
    }

    // Mostrar estructura de un ticket típico
    const sampleTicket = await Ticket.findOne().limit(1);
    if (sampleTicket) {
      console.log('\n📋 Estructura de un ticket de muestra:');
      console.log(JSON.stringify({
        'Ticket ID': sampleTicket['Ticket ID'],
        'Transaction ID': sampleTicket['Transaction ID'],
        'First Name': sampleTicket['First Name'],
        'Last Name': sampleTicket['Last Name'],
        'Seat': sampleTicket['Seat'],
        'Ticket': sampleTicket['Ticket'],
        '_id': sampleTicket._id
      }, null, 2));
    }

    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTicketIDs();
