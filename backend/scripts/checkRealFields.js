require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('../src/models/Ticket');

async function checkFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const ticket = await Ticket.findOne({ Ticket: { $regex: 'GENERAL', $options: 'i' } });
    
    if (ticket) {
      console.log('📋 CAMPOS REALES del documento:');
      console.log('='.repeat(80));
      const ticketObj = ticket.toObject();
      Object.keys(ticketObj).forEach(key => {
        console.log(`  "${key}": ${JSON.stringify(ticketObj[key])}`);
      });
      
      console.log('\n📄 DOCUMENTO COMPLETO:');
      console.log(JSON.stringify(ticketObj, null, 2));
    } else {
      console.log('❌ No se encontró ningún ticket GENERAL');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFields();
