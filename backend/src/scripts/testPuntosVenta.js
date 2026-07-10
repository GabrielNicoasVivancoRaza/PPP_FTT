// Script para probar la API de puntos de venta
const axios = require('axios');

const BASE_URL = 'http://localhost:5002/api';

// Función para hacer login y obtener token
const login = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      usuario: 'admin', // Cambia por tu usuario administrador
      password: 'admin123' // Cambia por tu contraseña
    });
    
    console.log('✅ Login exitoso');
    return response.data.token;
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    return null;
  }
};

// Función para obtener puntos de venta
const getPuntosVenta = async (token) => {
  try {
    const response = await axios.get(`${BASE_URL}/puntos-venta`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Puntos de venta obtenidos:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo puntos de venta:', error.response?.data || error.message);
    return null;
  }
};

// Función para crear un punto de venta de prueba
const createPuntoVenta = async (token) => {
  try {
    const puntoVenta = {
      nombre: 'Punto de Prueba',
      descripcion: 'Punto de venta para testing',
      localidades: ['GENERAL', 'PREFERENCIA']
    };
    
    const response = await axios.post(`${BASE_URL}/puntos-venta`, puntoVenta, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Punto de venta creado:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creando punto de venta:', error.response?.data || error.message);
    return null;
  }
};

// Función principal
const main = async () => {
  console.log('🧪 Iniciando pruebas de API...\n');
  
  // 1. Login
  const token = await login();
  if (!token) {
    console.log('❌ No se pudo obtener token, abortando pruebas');
    return;
  }
  
  console.log('\n');
  
  // 2. Obtener puntos de venta existentes
  await getPuntosVenta(token);
  
  console.log('\n');
  
  // 3. Crear un punto de venta
  await createPuntoVenta(token);
  
  console.log('\n');
  
  // 4. Obtener puntos de venta nuevamente
  await getPuntosVenta(token);
  
  console.log('\n✨ Pruebas completadas');
};

main().catch(console.error);
