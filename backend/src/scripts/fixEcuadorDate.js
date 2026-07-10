// Script para asignar HOY (20 de octubre, Ecuador) a FechaUno
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Schedule = require('../models/Schedule');

const fixToday = async () => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // HOY en Ecuador es 20 de octubre
    const ecuadorToday = '2025-10-20';
    
    console.log(`📅 Asignando ${ecuadorToday} (HOY en Ecuador) a FechaUno...\n`);

    // Actualizar/crear schedule para hoy
    const result = await Schedule.findOneAndUpdate(
      { fecha: ecuadorToday },
      { 
        coleccion: 'FechaUno',
        activo: true
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Schedule actualizado:`);
    console.log(`   ${result.fecha} → ${result.coleccion} (activo: ${result.activo})\n`);

    // Mostrar schedules cercanos
    console.log('📋 Schedules de los próximos días:');
    console.log('='.repeat(50));
    const nearSchedules = await Schedule.find({
      fecha: { $gte: '2025-10-20', $lte: '2025-10-25' }
    }).sort({ fecha: 1 });

    nearSchedules.forEach(s => {
      const icon = s.coleccion === 'FechaUno' ? '🎵' : 
                   s.coleccion === 'FechaDos' ? '🎸' : '🎤';
      const marker = s.fecha === ecuadorToday ? ' ← HOY' : '';
      console.log(`${icon} ${s.fecha} → ${s.coleccion}${marker}`);
    });
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixToday();
