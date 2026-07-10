const mongoose = require('mongoose');
require('dotenv').config();

async function testFilters() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a BD');
    
    const Ticket = require('../src/models/Ticket');
    
    // Probar búsqueda por Ticket ID exacto
    const ticketIdSearch = 17237508;
    const byTicketId = await Ticket.find({ 'Ticket ID': ticketIdSearch }).limit(5).lean();
    console.log(`\n✅ Búsqueda por Ticket ID (${ticketIdSearch}):`);
    console.log(`   - Encontrados: ${byTicketId.length}`);
    if (byTicketId.length > 0) {
      console.log(`   - Ejemplo: ${byTicketId[0]['First Name']} ${byTicketId[0]['Last Name']}`);
    }
    
    // Probar búsqueda por nombre (First Name)
    const firstName = 'Anahi';
    const byFirstName = await Ticket.find({ 'First Name': new RegExp(firstName, 'i') }).limit(5).lean();
    console.log(`\n✅ Búsqueda por nombre (${firstName}):`);
    console.log(`   - Encontrados: ${byFirstName.length}`);
    if (byFirstName.length > 0) {
      console.log(`   - Ejemplo: ${byFirstName[0]['First Name']} ${byFirstName[0]['Last Name']}`);
    }
    
    // Probar búsqueda por apellido (Last Name)
    const lastName = 'Flor';
    const byLastName = await Ticket.find({ 'Last Name': new RegExp(lastName, 'i') }).limit(5).lean();
    console.log(`\n✅ Búsqueda por apellido (${lastName}):`);
    console.log(`   - Encontrados: ${byLastName.length}`);
    if (byLastName.length > 0) {
      console.log(`   - Ejemplo: ${byLastName[0]['First Name']} ${byLastName[0]['Last Name']}`);
    }
    
    // Probar búsqueda con $or (combinada)
    const searchTerm = 'Flor';
    const searchRegex = new RegExp(searchTerm, 'i');
    const combined = await Ticket.find({
      $or: [
        { 'First Name': searchRegex },
        { 'Last Name': searchRegex },
        { 'Email': searchRegex }
      ]
    }).limit(5).lean();
    console.log(`\n✅ Búsqueda combinada ($or) con "${searchTerm}":`);
    console.log(`   - Encontrados: ${combined.length}`);
    if (combined.length > 0) {
      console.log(`   - Primer resultado: ${combined[0]['First Name']} ${combined[0]['Last Name']}`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ TEST COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFilters();
