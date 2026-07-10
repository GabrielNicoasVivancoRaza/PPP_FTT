const axios = require('axios');

const testLogin = async () => {
  try {
    console.log('🧪 Probando login con las credenciales...');
    
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      usuario: 'admin@shakira.com',
      password: 'FTT2025'
    });

    console.log('✅ Login exitoso!');
    console.log('📋 Respuesta del servidor:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('❌ Error en login:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
};

testLogin();
