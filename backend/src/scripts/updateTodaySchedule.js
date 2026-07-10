// Script para actualizar el schedule de hoy
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Schedule = require('../models/Schedule');

const updateToday = async () => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Obtener fecha de hoy
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha de HOY detectada: ${today}\n`);

    // Actualizar schedule de hoy a FechaUno
    const result = await Schedule.findOneAndUpdate(
      { fecha: today },
      { 
        coleccion: 'FechaUno',
        activo: true
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Schedule actualizado:`);
    console.log(`   ${result.fecha} → ${result.coleccion} (activo: ${result.activo})\n`);

    // Verificar
    const check = await Schedule.findOne({ fecha: today });
    console.log('✅ Verificación exitosa:');
    console.log(`   HOY (${today}) está asignado a: ${check.coleccion}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateToday();
