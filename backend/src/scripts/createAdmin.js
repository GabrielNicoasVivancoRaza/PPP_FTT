const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un usuario jefe. "roles: 'jefe'" matchea a
    // cualquier documento donde 'jefe' esté en el array; "rol: 'jefe'"
    // cubre además las cuentas viejas que todavía no tienen "roles".
    const adminExists = await User.findOne({ $or: [{ rol: 'jefe' }, { roles: 'jefe' }] });

    if (adminExists) {
      console.log('✅ Usuario administrador ya existe:');
      console.log('   Usuario:', adminExists.usuario);
      console.log('   Nombre:', adminExists.nombre);
      console.log('   Rol:', adminExists.rol);
      console.log('   Primer acceso:', adminExists.primerAcceso);
    } else {
      // Crear usuario administrador
      const defaultAdmin = new User({
        nombre: 'Administrador',
        usuario: 'admin@shakira.com',
        password: process.env.DEFAULT_PASSWORD || 'FTT2025',
        roles: ['jefe'],
        primerAcceso: true,
        activo: true
      });

      await defaultAdmin.save();
      console.log('🎉 Usuario administrador creado exitosamente!');
      console.log('   Usuario: admin@shakira.com');
      console.log('   Contraseña:', process.env.DEFAULT_PASSWORD || 'FTT2025');
      console.log('   Rol: jefe');
    }

    // Listar todos los usuarios
    const allUsers = await User.find({});
    console.log('\n📋 Usuarios en la base de datos:');
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.nombre} (${user.usuario}) - ${user.rol}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
};

createAdminUser();
