// Script para verificar schedules en la base de datos
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Schedule = require('../models/Schedule');

const checkSchedules = async () => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Mostrar todos los schedules
    console.log('📋 Todos los schedules en la base de datos:');
    console.log('=' .repeat(60));
    const allSchedules = await Schedule.find().sort({ fecha: 1 });
    
    if (allSchedules.length === 0) {
      console.log('⚠️  No hay schedules en la base de datos\n');
    } else {
      allSchedules.forEach(s => {
        const estaActivo = s.activo ? '✅' : '❌';
        console.log(`${estaActivo} ${s.fecha} → ${s.coleccion} (activo: ${s.activo})`);
      });
      console.log(`\nTotal: ${allSchedules.length} schedules\n`);
    }

    // Verificar el schedule para hoy
    const today = new Date().toISOString().split('T')[0];
    console.log('=' .repeat(60));
    console.log(`📅 Verificando schedule para HOY (${today}):`);
    const todaySchedule = await Schedule.findOne({ 
      fecha: today,
      activo: true 
    });
    
    if (todaySchedule) {
      console.log(`✅ Schedule encontrado: ${todaySchedule.coleccion}`);
    } else {
      console.log('⚠️  No hay schedule para hoy (se usará FechaUno por defecto)');
    }
    console.log('=' .repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkSchedules();
