require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('../src/models/Ticket');

async function checkDataTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar el ticket específico que mencionaste
    const ticket = await Ticket.findOne({ 'Ticket ID': 15339638 }); // BUSCAR COMO NÚMERO
    
    if (ticket) {
      console.log('✅ ENCONTRADO COMO NÚMERO!');
      console.log('\nTicket encontrado:');
      console.log(JSON.stringify(ticket, null, 2));
      console.log('\nTipo de datos:');
      console.log(`  Ticket ID: ${typeof ticket['Ticket ID']} = ${ticket['Ticket ID']}`);
      console.log(`  Transaction ID: ${typeof ticket['Transaction ID']} = ${ticket['Transaction ID']}`);
    } else {
      console.log('❌ NO ENCONTRADO COMO NÚMERO');
      
      // Intentar como string
      const ticketStr = await Ticket.findOne({ 'Ticket ID': '15339638' });
      if (ticketStr) {
        console.log('✅ ENCONTRADO COMO STRING!');
        console.log(JSON.stringify(ticketStr, null, 2));
      } else {
        console.log('❌ NO ENCONTRADO COMO STRING TAMPOCO');
      }
    }

    // Ahora buscar el otro ticket que estabas intentando canjear
    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 Buscando ticket 15385500...\n');
    
    const ticket2Num = await Ticket.findOne({ 'Ticket ID': 15385500 });
    const ticket2Str = await Ticket.findOne({ 'Ticket ID': '15385500' });
    
    console.log(`Como número: ${ticket2Num ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO'}`);
    console.log(`Como string: ${ticket2Str ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO'}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDataTypes();
