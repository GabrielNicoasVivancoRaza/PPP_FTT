const mongoose = require('mongoose');
require('dotenv').config();

async function testQueries() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const Ticket = require('../src/models/Ticket');
    
    console.log('🧪 Probando búsquedas...\n');
    
    // Test 1: Ticket ID
    const ticketIdTest = await Ticket.find({ 'Ticket ID': '17237508' }).limit(1).lean();
    console.log('✅ Búsqueda por Ticket ID (17237508):');
    console.log('   Encontrados:', ticketIdTest.length);
    if (ticketIdTest.length > 0) {
      console.log('   Resultado:', ticketIdTest[0]['First Name'], ticketIdTest[0]['Last Name']);
    }
    
    // Test 2: Búsqueda general por apellido
    const lastNameTest = await Ticket.find({
      $or: [
        { 'First Name': { $regex: 'Flor', $options: 'i' } },
        { 'Last Name': { $regex: 'Flor', $options: 'i' } },
        { 'Email': { $regex: 'Flor', $options: 'i' } },
        { 'Numero de Cedula:': { $regex: 'Flor', $options: 'i' } }
      ]
    }).limit(5).lean();
    
    console.log('\n✅ Búsqueda general por "Flor":');
    console.log('   Encontrados:', lastNameTest.length);
    if (lastNameTest.length > 0) {
      lastNameTest.forEach((t, i) => {
        console.log(`   ${i+1}. ${t['First Name']} ${t['Last Name']}`);
      });
    }
    
    // Test 3: Búsqueda por Seat
    const seatTest = await Ticket.find({ 'Seat': { $regex: 'BLACK', $options: 'i' } }).limit(3).lean();
    console.log('\n✅ Búsqueda por Seat (BLACK):');
    console.log('   Encontrados:', seatTest.length);
    if (seatTest.length > 0) {
      seatTest.forEach((t, i) => {
        console.log(`   ${i+1}. ${t['First Name']} ${t['Last Name']} - ${t['Seat']}`);
      });
    }
    
    // Test 4: Múltiples filtros ($and)
    const multiTest = await Ticket.find({
      $and: [
        { 'Ticket ID': '17237508' },
        { 'Last Name': { $regex: 'Flor', $options: 'i' } }
      ]
    }).limit(1).lean();
    
    console.log('\n✅ Búsqueda combinada (Ticket ID + Last Name):');
    console.log('   Encontrados:', multiTest.length);
    if (multiTest.length > 0) {
      console.log('   Resultado:', multiTest[0]['First Name'], multiTest[0]['Last Name']);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ TESTS COMPLETADOS');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testQueries();
