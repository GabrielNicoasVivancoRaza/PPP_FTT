// Script para probar asignación de fechas al cronograma
// Ejecutar con: node backend/src/scripts/testSchedule.js

const mongoose = require('mongoose');
require('dotenv').config();

const Schedule = require('../models/Schedule');

const testSchedule = async () => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Crear algunas asignaciones de prueba
    const testDates = [
      { fecha: '2025-10-21', coleccion: 'FechaUno', activo: true },
      { fecha: '2025-10-22', coleccion: 'FechaUno', activo: true },
      { fecha: '2025-10-23', coleccion: 'FechaDos', activo: true },
      { fecha: '2025-10-24', coleccion: 'FechaDos', activo: true },
      { fecha: '2025-10-25', coleccion: 'FechaTres', activo: true },
    ];

    console.log('📅 Creando schedules de prueba...');
    
    for (const scheduleData of testDates) {
      await Schedule.findOneAndUpdate(
        { fecha: scheduleData.fecha },
        scheduleData,
        { upsert: true, new: true }
      );
      console.log(`✅ Schedule creado para ${scheduleData.fecha} -> ${scheduleData.coleccion}`);
    }

    // Mostrar todos los schedules
    console.log('\n📋 Schedules existentes:');
    const allSchedules = await Schedule.find().sort({ fecha: 1 });
    allSchedules.forEach(s => {
      console.log(`  ${s.fecha} -> ${s.coleccion} (activo: ${s.activo})`);
    });

    console.log('\n✅ Test completado!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testSchedule();
