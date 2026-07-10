require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('../src/models/Ticket');

async function verifyTickets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar tickets GENERAL (los que deberían verse en COLISEO NORTE)
    const generalTickets = await Ticket.find({ 
      Ticket: { $regex: 'GENERAL', $options: 'i' } 
    })
    .limit(10)
    .select('Ticket ID Transaction ID First Name Last Name Ticket canjeado');

    console.log(`📊 Total de tickets GENERAL encontrados: ${generalTickets.length}\n`);
    
    console.log('🎫 Primeros 10 tickets GENERAL en la base de datos:');
    console.log('='.repeat(80));
    generalTickets.forEach((ticket, index) => {
      console.log(`\n${index + 1}. Ticket ID: "${ticket['Ticket ID']}"`);
      console.log(`   Nombre: ${ticket['First Name']} ${ticket['Last Name']}`);
      console.log(`   Transaction ID: ${ticket['Transaction ID']}`);
      console.log(`   Tipo: ${ticket.Ticket}`);
      console.log(`   Canjeado: ${ticket.canjeado ? 'SÍ ✅' : 'NO ❌'}`);
    });

    // Contar total
    const total = await Ticket.countDocuments({ 
      Ticket: { $regex: 'GENERAL', $options: 'i' } 
    });
    console.log('\n' + '='.repeat(80));
    console.log(`\n📈 TOTAL de tickets GENERAL en DB: ${total}`);

    // Buscar el ticket específico que estás intentando canjear
    console.log('\n🔍 Buscando ticket ID 15385500...');
    const specificTicket = await Ticket.findOne({ 'Ticket ID': '15385500' });
    if (specificTicket) {
      console.log('✅ ¡ENCONTRADO!', specificTicket);
    } else {
      console.log('❌ NO EXISTE en la base de datos');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyTickets();
