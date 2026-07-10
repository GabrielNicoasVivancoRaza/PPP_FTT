const mongoose = require('mongoose');

let connectionAttempts = 0;
const maxRetries = 5;

const connectDB = async () => {
  try {
    // Configuración optimizada para prevenir cuelgues
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 segundos
      socketTimeoutMS: 45000, // 45 segundos
      connectTimeoutMS: 10000, // Timeout para conexión inicial
      heartbeatFrequencyMS: 10000, // Verificar estado cada 10 segundos
      maxPoolSize: 20, // Aumentado para más conexiones concurrentes
      minPoolSize: 5, // Mantener más conexiones disponibles
      maxIdleTimeMS: 30000, // Cerrar conexiones inactivas después de 30 segundos
      compressors: ['zlib'], // Compresión de datos
      zlibCompressionLevel: 6, // Nivel de compresión
      readPreference: 'primaryPreferred', // Leer del primario preferentemente
      retryWrites: true, // Reintentar escrituras
      retryReads: true, // Reintentar lecturas
      w: 'majority', // Confirmar escrituras en la mayoría de nodos
      journal: true, // Usar journal para durabilidad
      family: 4 // Forzar IPv4 para evitar problemas de DNS
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    connectionAttempts = 0; // Reset counter on successful connection

    // Manejar eventos de conexión
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
      connectionAttempts = 0; // Reset counter on reconnection
    });

    // Configurar mongoose para mejor performance
    mongoose.set('autoIndex', process.env.NODE_ENV !== 'production'); // Solo crear índices en desarrollo
    mongoose.set('debug', process.env.NODE_ENV === 'development'); // Debug solo en desarrollo

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    connectionAttempts++;
    
    if (connectionAttempts < maxRetries) {
      console.log(`Attempting to reconnect to MongoDB... (${connectionAttempts}/${maxRetries})`);
      setTimeout(() => {
        connectDB();
      }, 5000);
    } else {
      console.error('Max connection attempts reached. Please check your MongoDB connection.');
      // No hacer process.exit() para evitar cierres abruptos
    }
  }
};

module.exports = connectDB;
