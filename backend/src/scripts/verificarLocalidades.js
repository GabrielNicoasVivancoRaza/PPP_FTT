const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB conectado');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

// Verificar la estructura de los tickets para identificar localidades
const verificarLocalidades = async () => {
  const Ticket = require('../models/Ticket');
  
  try {
    console.log('\n🔍 Analizando localidades en tickets...');
    
    // Obtener todas las localidades únicas
    const localidades = await Ticket.distinct('Ticket');
    
    console.log(`\n📊 Total de localidades encontradas: ${localidades.length}`);
    
    // Localidades objetivo
    const localidadesObjetivo = [
      'GENERAL', 'PREFERENCIA', 'TRIBUNA', 
      'FAN ZONE', 'FANZONE', 'PALCO', 
      'GOLDEN', 'PLATINUM', 'BOX'
    ];
    
    // Verificar cuáles localidades objetivo existen en los datos
    const localidadesEncontradas = [];
    const localidadesNoEncontradas = [];
    
    for (const objetivo of localidadesObjetivo) {
      const encontrada = localidades.find(loc => 
        loc.toUpperCase().includes(objetivo.toUpperCase())
      );
      
      if (encontrada) {
        localidadesEncontradas.push({ objetivo, encontrada });
      } else {
        localidadesNoEncontradas.push(objetivo);
      }
    }
    
    console.log('\n✅ Localidades objetivo encontradas:');
    localidadesEncontradas.forEach(({ objetivo, encontrada }) => {
      console.log(`  - ${objetivo}: "${encontrada}"`);
    });
    
    if (localidadesNoEncontradas.length > 0) {
      console.log('\n❌ Localidades objetivo NO encontradas:');
      localidadesNoEncontradas.forEach(loc => {
        console.log(`  - ${loc}`);
      });
    }
    
    // Contar tickets por localidad encontrada
    console.log('\n📈 Conteo de tickets por localidad:');
    for (const { objetivo, encontrada } of localidadesEncontradas) {
      const count = await Ticket.countDocuments({
        'Ticket': { $regex: encontrada, $options: 'i' }
      });
      console.log(`  - ${encontrada}: ${count} tickets`);
    }
    
    // Mostrar todas las localidades para referencia
    console.log('\n📋 Todas las localidades en la base de datos:');
    localidades.slice(0, 20).forEach(loc => {
      console.log(`  - "${loc}"`);
    });
    
    if (localidades.length > 20) {
      console.log(`  ... y ${localidades.length - 20} más`);
    }
    
  } catch (error) {
    console.error('❌ Error verificando localidades:', error);
  }
};

const main = async () => {
  await connectDB();
  await verificarLocalidades();
  
  console.log('\n✨ Verificación completada');
  process.exit(0);
};

main();
