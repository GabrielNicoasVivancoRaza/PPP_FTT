require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const { importTicketsFromCSV } = require('./src/utils/csvImporter');

const initializeDatabase = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Crear usuario jefe por defecto si no existe
    const existingAdmin = await User.findOne({ rol: 'jefe' });
    
    if (!existingAdmin) {
      const adminUser = new User({
        nombre: 'Administrador',
        usuario: 'admin@shakira.com',
        password: process.env.DEFAULT_PASSWORD,
        rol: 'jefe',
        primerAcceso: true
      });

      await adminUser.save();
      console.log('Usuario administrador creado');
      console.log('Email: admin@shakira.com');
      console.log('Contraseña:', process.env.DEFAULT_PASSWORD);
    } else {
      console.log('Usuario administrador ya existe');
    }

    // Importar tickets desde CSV si está disponible
    const csvPath = './chakiraPrueba.csv';
    try {
      const ticketsImported = await importTicketsFromCSV(csvPath);
      console.log(`${ticketsImported} tickets importados desde CSV`);
    } catch (error) {
      console.log('No se pudo importar el CSV (archivo no encontrado o ya importado)');
    }

    console.log('Inicialización completada');
    process.exit(0);

  } catch (error) {
    console.error('Error en la inicialización:', error);
    process.exit(1);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
