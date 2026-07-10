const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Ticket = require('../src/models/Ticket');
    
    // Get sample Ticket ID
    const sample = await Ticket.findOne({ 'Last Name': 'Flor' }).lean();
    const ticketId = sample['Ticket ID'];
    
    console.log('Ticket ID valor:', ticketId);
    console.log('Ticket ID longitud:', ticketId.length);
    console.log('Ticket ID bytes:', Buffer.from(ticketId).toString('hex'));
    
    // Buscar de múltiples formas
    const test1 = await Ticket.find({ 'Ticket ID': ticketId }).lean();
    const test2 = await Ticket.find({ 'Ticket ID': ticketId.trim() }).lean();
    const test3 = await Ticket.find({ 'Ticket ID': { $eq: ticketId } }).lean();
    const test4 = await Ticket.find({ 'Ticket ID': { $regex: ticketId, $options: 'i' } }).lean();
    
    console.log('\nBúsqueda directa:', test1.length);
    console.log('Búsqueda con trim:', test2.length);
    console.log('Búsqueda con $eq:', test3.length);
    console.log('Búsqueda con $regex:', test4.length);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
