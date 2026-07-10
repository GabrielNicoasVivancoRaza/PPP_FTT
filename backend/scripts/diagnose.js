const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado');
    
    const Ticket = require('../src/models/Ticket');
    
    const count = await Ticket.countDocuments();
    console.log(`📊 Total de tickets: ${count}`);
    
    const seats = await Ticket.distinct('Seat');
    console.log(`🎪 Localidades (Seat) encontradas: ${seats.length}`);
    if (seats.length > 0) {
      console.log('Primeras 10:', seats.slice(0, 10));
    } else {
      console.log('❌ NO HAY LOCALIDADES - Los tickets no tienen datos en el campo Seat');
    }
    
    const noSeat = await Ticket.countDocuments({ Seat: { $exists: false } });
    const emptySeat = await Ticket.countDocuments({ Seat: '' });
    
    console.log(`\n⚠️  Tickets sin campo Seat: ${noSeat}`);
    console.log(`⚠️  Tickets con Seat vacío: ${emptySeat}`);
    
    const sample = await Ticket.findOne().lean();
    console.log('\n📄 Documento de ejemplo:');
    console.log(JSON.stringify(sample, null, 2).substring(0, 1000));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

check();
