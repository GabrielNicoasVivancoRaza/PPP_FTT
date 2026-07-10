// Script para limpiar y crear schedules de prueba claros
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Schedule = require('../models/Schedule');

const resetSchedules = async () => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Limpiar todos los schedules
    console.log('🗑️  Limpiando schedules existentes...');
    await Schedule.deleteMany({});
    console.log('✅ Schedules eliminados\n');

    // Crear schedules de prueba para octubre
    const schedules = [
      // HOY y días cercanos
      { fecha: '2025-10-21', coleccion: 'FechaUno' },  // HOY
      { fecha: '2025-10-22', coleccion: 'FechaUno' },
      { fecha: '2025-10-23', coleccion: 'FechaDos' },
      { fecha: '2025-10-24', coleccion: 'FechaDos' },
      { fecha: '2025-10-25', coleccion: 'FechaTres' },
      { fecha: '2025-10-26', coleccion: 'FechaTres' },
      
      // Más días para probar calendario
      { fecha: '2025-10-27', coleccion: 'FechaUno' },
      { fecha: '2025-10-28', coleccion: 'FechaDos' },
      { fecha: '2025-10-29', coleccion: 'FechaTres' },
      { fecha: '2025-10-30', coleccion: 'FechaUno' },
    ];

    console.log('📅 Creando schedules de prueba...');
    for (const s of schedules) {
      await Schedule.create({ ...s, activo: true });
      const icon = s.coleccion === 'FechaUno' ? '🎵' : 
                   s.coleccion === 'FechaDos' ? '🎸' : '🎤';
      console.log(`  ${icon} ${s.fecha} → ${s.coleccion}`);
    }

    console.log(`\n✅ ${schedules.length} schedules creados exitosamente`);
    
    // Verificar HOY
    const today = new Date().toISOString().split('T')[0];
    const todaySchedule = await Schedule.findOne({ fecha: today });
    console.log('\n' + '='.repeat(50));
    console.log(`📅 HOY (${today}): ${todaySchedule ? todaySchedule.coleccion : 'Sin asignar'}`);
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

resetSchedules();
