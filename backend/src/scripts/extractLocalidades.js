// Script para extraer localidades únicas del CSV y crear Puntos de Venta
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const PuntoVenta = require('../models/PuntoVenta');
const User = require('../models/User');
const connectDB = require('../config/database');

const extractLocalidadesFromCSV = async (csvFilePath) => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conectado a MongoDB\n');

    const localidades = new Set();
    let rowCount = 0;

    console.log(`📄 Leyendo CSV: ${csvFilePath}\n`);

    // Leer CSV y extraer localidades únicas
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          const seat = row['Seat']?.trim();
          if (seat) {
            localidades.add(seat);
            console.log(`   Fila ${rowCount}: Localidad "${seat}"`);
          }
        })
        .on('end', () => {
          console.log(`\n✅ CSV procesado. Total de filas: ${rowCount}\n`);
          resolve();
        })
        .on('error', reject);
    });

    const uniqueLocalidades = Array.from(localidades).sort();
    console.log(`📍 Localidades únicas encontradas (${uniqueLocalidades.length}):`);
    uniqueLocalidades.forEach(loc => console.log(`   - ${loc}`));
    console.log('\n');

    // Obtener o crear usuario admin
    let adminUser = await User.findOne({ rol: 'jefe' });
    if (!adminUser) {
      console.log('⚠️  No hay usuario admin. Creando usuario por defecto...');
      adminUser = await User.create({
        nombre: 'Admin System',
        usuario: 'admin-system',
        email: 'admin@system.local',
        password: 'system-default',
        rol: 'jefe',
        activo: true
      });
      console.log('✅ Usuario admin creado\n');
    }

    // Crear Punto de Venta único con todas las localidades
    const puntoVentaName = 'LUMINEERS - General';
    const existingPunto = await PuntoVenta.findOne({ nombre: puntoVentaName });

    if (existingPunto) {
      console.log(`🔄 Actualizando Punto de Venta existente: "${puntoVentaName}"\n`);
      existingPunto.localidades = uniqueLocalidades;
      existingPunto.descripcion = `Concierto Lumineers - ${uniqueLocalidades.length} localidades`;
      await existingPunto.save();
      console.log(`✅ Actualizado con ${uniqueLocalidades.length} localidades\n`);
    } else {
      console.log(`✨ Creando nuevo Punto de Venta: "${puntoVentaName}"\n`);
      const puntoVenta = new PuntoVenta({
        nombre: puntoVentaName,
        descripcion: `Concierto Lumineers - ${uniqueLocalidades.length} localidades`,
        localidades: uniqueLocalidades,
        creadoPor: adminUser._id,
        activo: true
      });
      await puntoVenta.save();
      console.log(`✅ Punto de Venta creado con ${uniqueLocalidades.length} localidades\n`);
    }

    console.log('🎉 Proceso completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Ejecutar si se pasa ruta de CSV como argumento
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('❌ Uso: node extractLocalidades.js <ruta-csv>');
  console.error('Ejemplo: node extractLocalidades.js ../../LUMINEERS.csv');
  process.exit(1);
}

const fullPath = path.resolve(__dirname, csvPath);
if (!fs.existsSync(fullPath)) {
  console.error(`❌ Archivo no encontrado: ${fullPath}`);
  process.exit(1);
}

extractLocalidadesFromCSV(fullPath);
