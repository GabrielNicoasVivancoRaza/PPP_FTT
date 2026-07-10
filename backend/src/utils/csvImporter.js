const fs = require('fs');
const csv = require('csv-parser');
const Ticket = require('../models/Ticket');

const importTicketsFromCSV = async (filePath) => {
  const tickets = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Mapear los campos del CSV a nuestro modelo
        const ticket = {
          firstName: row['First Name']?.trim() || '',
          lastName: row['Last Name']?.trim() || '',
          email: row['Email']?.trim() || '',
          ticket: row['Ticket']?.trim() || '',
          seat: row['Seat']?.trim() || '',
          transactionId: row['Transaction ID']?.trim() || '',
          ticketId: row['Ticket ID']?.trim() || '',
          cedula: row['Numero de Cedula:']?.trim() || ''
        };
        
        // Solo agregar si tiene los campos mínimos requeridos
        if (ticket.firstName && ticket.lastName && ticket.ticketId && ticket.transactionId) {
          tickets.push(ticket);
        }
      })
      .on('end', async () => {
        try {
          console.log(`Procesando ${tickets.length} tickets...`);
          
          // Insertar en lotes para mejor rendimiento
          const batchSize = 100;
          for (let i = 0; i < tickets.length; i += batchSize) {
            const batch = tickets.slice(i, i + batchSize);
            await Ticket.insertMany(batch, { ordered: false });
          }
          
          console.log(`${tickets.length} tickets importados exitosamente`);
          resolve(tickets.length);
        } catch (error) {
          console.error('Error al importar tickets:', error);
          reject(error);
        }
      })
      .on('error', reject);
  });
};

module.exports = {
  importTicketsFromCSV
};
