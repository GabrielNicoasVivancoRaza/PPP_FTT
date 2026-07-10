const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const { getTicketModel } = require('../config/collections');
const connectDB = require('../config/database');

const importTicketsFromCSV = async (csvFilePath) => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conectado a MongoDB\n');

    // Obtener el modelo de Ticket para la colección configurada
    const TicketModel = getTicketModel();
    
    const tickets = [];
    let rowCount = 0;

    console.log(`📄 Leyendo CSV: ${csvFilePath}\n`);

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        const ticket = {
          'First Name': row['First Name']?.trim() || '',
          'Last Name': row['Last Name']?.trim() || '',
          'Email': row['Email']?.toLowerCase().trim() || '',
          'Ticket': row['Ticket']?.trim() || '',
          'Seat': row['Seat']?.trim() || '',
          'Transaction ID': parseInt(row['Transaction ID']) || 0,
          'Ticket ID': parseInt(row['Ticket ID']) || 0,
          'Numero de Cedula:': row['Numero de Cedula:']?.trim() || '',
          'Transaction Date (Local)': row['Transaction Date (Local)']?.trim() || '',
          'Barcode Data': row['Barcode Data']?.trim() || ''
        };

        // Solo agregar si tiene datos esenciales
        if (ticket['Ticket ID'] && ticket['Transaction ID']) {
          tickets.push(ticket);
          if (rowCount % 50 === 0) {
            console.log(`   Procesadas ${rowCount} filas...`);
          }
        }
      })
      .on('end', async () => {
        try {
          console.log(`\n✅ CSV procesado. Total de tickets válidos: ${tickets.length}\n`);
          console.log(`📝 Importando ${tickets.length} tickets a la colección "${process.env.COLLECTION_NAME || 'Lumineers_Canje'}"...\n`);
          
          // Insertar en lotes para mejor rendimiento
          const batchSize = 100;
          for (let i = 0; i < tickets.length; i += batchSize) {
            const batch = tickets.slice(i, i + batchSize);
            try {
              await TicketModel.insertMany(batch, { ordered: false });
              const processed = Math.min(i + batchSize, tickets.length);
              console.log(`   ✅ Procesados ${processed}/${tickets.length} tickets`);
            } catch (batchError) {
              // Continuar con el siguiente lote incluso si hay errores
              console.log(`   ⚠️  Error en lote: ${batchError.message}`);
            }
          }
          
          console.log('\n🎉 Importación completada exitosamente');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error durante la importación:', error);
          process.exit(1);
        }
      })
      .on('error', (error) => {
        console.error('❌ Error leyendo CSV:', error);
        process.exit(1);
      });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Usar desde línea de comandos: node importCSV.js path/to/file.csv
if (require.main === module) {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.log('Usage: node importCSV.js <path-to-csv-file>');
    process.exit(1);
  }
  importTicketsFromCSV(csvPath);
}

module.exports = importTicketsFromCSV;
