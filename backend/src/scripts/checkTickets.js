const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
require('dotenv').config();

const checkTickets = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado a MongoDB');

    // Contar documentos en la colección
    const totalTickets = await Ticket.countDocuments();
    console.log(`📊 Total de tickets en FechaUno: ${totalTickets}`);

    if (totalTickets > 0) {
      // Mostrar los primeros 5 tickets como ejemplo
      const sampleTickets = await Ticket.find().limit(5);
      console.log('\n📋 Primeros 5 tickets:');
      sampleTickets.forEach((ticket, index) => {
        console.log(`${index + 1}. ${ticket['First Name']} ${ticket['Last Name']} - ${ticket['Seat']} - ${ticket['Ticket ID']}`);
      });

      // Verificar estructura de campos
      const firstTicket = sampleTickets[0];
      console.log('\n🔍 Estructura del primer ticket:');
      console.log(JSON.stringify(firstTicket, null, 2));
    } else {
      console.log('❌ No hay tickets en la colección FechaUno');
      
      // Verificar si existe la colección
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      console.log('\n📁 Colecciones disponibles:', collectionNames);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
};

checkTickets();
