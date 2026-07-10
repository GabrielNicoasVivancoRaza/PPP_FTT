#!/usr/bin/env node

// Script maestro para configurar la base de datos Lumineers
// Uso: node setup.js <ruta-csv> [--force]

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('../config/database');
const { getTicketModel } = require('../config/collections');
const PuntoVenta = require('../models/PuntoVenta');
const User = require('../models/User');

const csv = require('csv-parser');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  SETUP LUMINEERS DATABASE - Sistema de Canje de Boletos   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const args = process.argv.slice(2);
const csvPath = args[0];
const forceFlag = args.includes('--force');

if (!csvPath) {
  console.error('❌ Uso: node setup.js <ruta-csv> [--force]');
  console.error('\nEjemplo:');
  console.error('  node setup.js ../../LUMINEERS.csv');
  console.error('  node setup.js ../../LUMINEERS.csv --force  (elimina datos previos)');
  process.exit(1);
}

const fullPath = path.resolve(__dirname, csvPath);
if (!fs.existsSync(fullPath)) {
  console.error(`❌ Archivo no encontrado: ${fullPath}`);
  process.exit(1);
}

const setupDatabase = async () => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conectado a MongoDB\n');

    const TicketModel = getTicketModel();

    // Paso 1: Limpiar datos previos si se especifica --force
    if (forceFlag) {
      console.log('🗑️  Limpiando datos previos (--force)...');
      try {
        const deleteResult = await TicketModel.deleteMany({});
        console.log(`   ✅ Eliminados ${deleteResult.deletedCount} tickets previos\n`);
      } catch (err) {
        console.log('   ⚠️  No hay tickets previos\n');
      }
    }

    // Paso 2: Importar tickets del CSV
    console.log('📥 PASO 1: Importando tickets del CSV...\n');
    
    const tickets = [];
    const localidades = new Set();
    let rowCount = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(fullPath)
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          
          // Extraer localidad
          const seat = row['Seat']?.trim();
          if (seat) {
            localidades.add(seat);
          }

          const ticket = {
            'First Name': row['First Name']?.trim() || '',
            'Last Name': row['Last Name']?.trim() || '',
            'Email': row['Email']?.toLowerCase().trim() || '',
            'Ticket': row['Ticket']?.trim() || '',
            'Seat': seat || '',
            'Transaction ID': parseInt(row['Transaction ID']) || 0,
            'Ticket ID': parseInt(row['Ticket ID']) || 0,
            'Numero de Cedula:': row['Numero de Cedula:']?.trim() || '',
            'Transaction Date (Local)': row['Transaction Date (Local)']?.trim() || '',
            'Barcode Data': row['Barcode Data']?.trim() || ''
          };

          // Solo agregar si tiene datos esenciales
          if (ticket['Ticket ID'] && ticket['Transaction ID']) {
            tickets.push(ticket);
            if (rowCount % 100 === 0) {
              process.stdout.write(`   📝 Procesadas ${rowCount} filas...\r`);
            }
          }
        })
        .on('end', () => {
          console.log(`\n   ✅ CSV procesado: ${tickets.length} tickets válidos, ${localidades.size} localidades únicas\n`);
          resolve();
        })
        .on('error', reject);
    });

    // Insertar tickets
    if (tickets.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < tickets.length; i += batchSize) {
        const batch = tickets.slice(i, i + batchSize);
        try {
          await TicketModel.insertMany(batch, { ordered: false });
          const processed = Math.min(i + batchSize, tickets.length);
          console.log(`   ✅ Insertados ${processed}/${tickets.length} tickets`);
        } catch (batchError) {
          console.log(`   ⚠️  Error en lote (continuando): ${batchError.message}`);
        }
      }
    }

    // Paso 3: Crear Punto de Venta con localidades
    console.log('\n📍 PASO 2: Configurando Puntos de Venta...\n');

    // Obtener o crear usuario admin
    let adminUser = await User.findOne({ rol: 'jefe' });
    if (!adminUser) {
      console.log('   👤 Creando usuario admin del sistema...');
      adminUser = await User.create({
        nombre: 'Sistema',
        usuario: 'sistema',
        email: 'sistema@lumineers.local',
        password: 'sistema-inicial',
        rol: 'jefe',
        activo: true
      });
      console.log('   ✅ Usuario admin creado\n');
    } else {
      console.log(`   ✅ Usuario admin encontrado: ${adminUser.nombre}\n`);
    }

    // Crear o actualizar Punto de Venta
    const uniqueLocalidades = Array.from(localidades).sort();
    const puntoVentaName = 'LUMINEERS - General';
    
    let puntoVenta = await PuntoVenta.findOne({ nombre: puntoVentaName });

    if (puntoVenta) {
      console.log(`   🔄 Actualizando Punto de Venta: "${puntoVentaName}"`);
      puntoVenta.localidades = uniqueLocalidades;
      puntoVenta.descripcion = `Concierto Lumineers - ${uniqueLocalidades.length} localidades`;
      await puntoVenta.save();
      console.log(`   ✅ Actualizado con ${uniqueLocalidades.length} localidades\n`);
    } else {
      console.log(`   ✨ Creando nuevo Punto de Venta: "${puntoVentaName}"`);
      puntoVenta = new PuntoVenta({
        nombre: puntoVentaName,
        descripcion: `Concierto Lumineers - ${uniqueLocalidades.length} localidades`,
        localidades: uniqueLocalidades,
        creadoPor: adminUser._id,
        activo: true
      });
      await puntoVenta.save();
      console.log(`   ✅ Creado con ${uniqueLocalidades.length} localidades\n`);
    }

    // Mostrar resumen de localidades
    console.log('📊 LOCALIDADES IMPORTADAS:\n');
    uniqueLocalidades.forEach((loc, idx) => {
      console.log(`   ${idx + 1}. ${loc}`);
    });

    // Resumen final
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ SETUP COMPLETADO                     ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Database: ${(process.env.MONGODB_URI || 'Lumineers').substring(0, 50).padEnd(50)}║`);
    console.log(`║ Colección: ${(process.env.COLLECTION_NAME || 'Lumineers_Canje').padEnd(50).substring(0, 50)}║`);
    console.log(`║ Tickets importados: ${tickets.length.toString().padEnd(44)}║`);
    console.log(`║ Localidades: ${uniqueLocalidades.length.toString().padEnd(48)}║`);
    console.log(`║ Punto de Venta: ${puntoVentaName.padEnd(45)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error durante el setup:', error);
    process.exit(1);
  }
};

setupDatabase();
