# 🎫 Canje FTT - Sistema de Canje de Boletos

Sistema de gestión para canje de boletos del concierto de **Lumineers**.

## 📌 Versión: 2.0 (Lumineers)

**Base de datos**: MongoDB (Lumineers)  
**Colección**: Lumineers_Canje  
**Localidades**: Dinámicas (extraídas del CSV)

---

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Configurar .env en backend
cp backend/.env.example backend/.env
# Editar: MONGODB_URI, JWT_SECRET

# 3. ⭐ Importar CSV (automático)
cd backend
node src/scripts/setup.js ../../LUMINEERS.csv
cd ..

# 4. Iniciar servidores
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

**Login inicial**: usuario `sistema` / contraseña `sistema-inicial`

---

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| [⚡ GUIA_RAPIDA.md](GUIA_RAPIDA.md) | Comienza en 5 minutos |
| [📖 SETUP.md](SETUP.md) | Instalación y configuración completa |
| [📋 CAMBIOS.md](CAMBIOS.md) | Detalle de cambios en v2.0 |

---

## ✨ Características Principales

- ✅ **Canje de boletos** con registro completo
- ✅ **Localidades dinámicas** (columna "Seat" del CSV)
- ✅ **Auditoría completa** de todos los canjes
- ✅ **Gestión de usuarios** por roles
- ✅ **Dashboard** con estadísticas
- ✅ **Importación automática** del CSV
- ✅ **Sistema de puntos de venta**
- ✅ **Búsqueda avanzada** de boletos

---

## 👥 Roles del Sistema

### Jefe (Administrador)
- Acceso total al sistema
- Dashboard con estadísticas
- Gestión de usuarios
- Auditoría completa
- Canje de boletos

### Staff
- Canje de boletos
- Búsqueda de boletos
- (Sin acceso a administración)

---

## 🗂️ Estructura del Proyecto

```
Canje FTT/
├── backend/
│   ├── src/
│   │   ├── models/          # Modelos MongoDB
│   │   ├── routes/          # Rutas API
│   │   ├── controllers/     # Lógica de negocio
│   │   ├── middleware/      # Middleware Express
│   │   └── scripts/         # Scripts utilitarios
│   ├── .env                 # Variables de entorno
│   ├── .env.example         # Ejemplo de .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # Páginas React
│   │   ├── components/      # Componentes reutilizables
│   │   ├── context/         # Context API
│   │   └── services/        # Servicios API
│   ├── .env.local           # Variables de entorno
│   └── package.json
├── LUMINEERS.csv            # Datos de boletos
├── GUIA_RAPIDA.md           # Inicio rápido ⭐
├── SETUP.md                 # Documentación completa
└── CAMBIOS.md               # Changelog
```

---

## 🔧 Scripts Disponibles

### Backend
```bash
npm run dev        # Iniciar con nodemon
npm start          # Iniciar en producción
npm test           # Tests
```

### Frontend
```bash
npm run dev        # Dev server
npm run build      # Build para producción
npm run preview    # Preview del build
npm run lint       # Verificar linting
```

### Setup
```bash
# Importar CSV e inicializar datos
node src/scripts/setup.js ../../LUMINEERS.csv

# Con --force para limpiar datos previos
node src/scripts/setup.js ../../LUMINEERS.csv --force

# Listar tickets importados
node src/scripts/listRealTickets.js

# Buscar un ticket específico
node src/scripts/findTicket.js <ticket-id>
```

---

## 🗄️ Base de Datos

### MongoDB Collections

**Lumineers_Canje**: Boletos importados del CSV
- First Name, Last Name, Email
- Ticket, Seat (=localidad)
- Transaction ID, Ticket ID
- Numero de Cedula

**PuntosVenta**: Puntos de venta/localidades
- Nombre
- Localidades (extraído automáticamente del CSV)
- Estado (activo/inactivo)

**Users**: Usuarios del sistema
- nombre, usuario, email, password
- rol (jefe, staff)
- Timestamps

**AuditLog**: Registro de auditoría
- user, action, collection, documentId
- oldValue, newValue
- Timestamp

---

## 🔄 Flujo de Canje

1. Staff visualiza lista de boletos
2. Busca/filtra por localidad, nombre, etc.
3. Selecciona boleto para canjear
4. Sistema registra el canje en auditoría
5. Boleto aparece como canjeado

---

## 🌐 Variables de Entorno

### Backend `.env`
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/Lumineers
COLLECTION_NAME=Lumineers_Canje
JWT_SECRET=tu-secret-seguro
DEFAULT_PASSWORD=contraseña-inicial
PORT=5002
NODE_ENV=development
```

### Frontend `.env.local`
```
VITE_API_URL=http://localhost:5002
```

---

## 🆕 v2.0 Cambios Principales

✅ **Base de datos unificada**: Solo Lumineers  
✅ **Colección única**: Lumineers_Canje (sin múltiples fechas)  
✅ **Localidades dinámicas**: Del CSV, no hardcodeadas  
✅ **Sin Schedule**: Eliminada toda lógica de cronograma  
✅ **Setup automático**: Un script lo hace todo  
✅ **Más simple**: Menos código, más mantenible  

**Archivos removidos**:
- Schedule model, controller, routes
- SchedulePage (frontend)
- Lógica de múltiples colecciones

---

## 🚀 Deployment (Render)

### Backend
1. Push a GitHub
2. Conectar en Render
3. Set variables de entorno
4. Build: `npm install`
5. Start: `npm start`

### Frontend
1. Build: `npm run build`
2. Deploy desde carpeta `dist`
3. Set VITE_API_URL a tu backend en Render

---

## 🐛 Troubleshooting

**"Cannot find module csv-parser"**
```bash
cd backend && npm install csv-parser
```

**"MONGODB_URI not configured"**
→ Revisar archivo `.env`

**"No aparecen boletos"**
→ Ejecutar: `node src/scripts/setup.js ../../LUMINEERS.csv`

**"Las localidades están vacías"**
→ Usar --force: `node src/scripts/setup.js ../../LUMINEERS.csv --force`

---

## 📞 Soporte

- Ver [GUIA_RAPIDA.md](GUIA_RAPIDA.md) para inicio rápido
- Ver [SETUP.md](SETUP.md) para configuración detallada
- Ver [CAMBIOS.md](CAMBIOS.md) para entender qué cambió

---

## 📝 Licencia

MIT

---

**Última actualización**: Abril 2026  
**Versión**: 2.0.0 (Lumineers)
- **Acciones**: imprimir, reimprimir (según rol)

### Formulario de Impresión
- ¿Quién retira? (Titular/Titular Compra/Otro)
- Campo ¿Quién? (si es "Otro")
- Celular (obligatorio)
- Registro automático de usuario responsable y fecha

### Sistema de Auditoría
- Registro de todas las acciones importantes
- Logs de impresiones y reimpresiones
- Historial de logins/logouts
- Creación de usuarios
- Cambios de contraseña

## 🛠️ Tecnologías

### Backend
- Node.js & Express
- MongoDB Atlas
- Mongoose ODM
- JWT para autenticación
- bcryptjs para hash de contraseñas
- Winston para logging
- Helmet para seguridad
- Rate limiting

### Frontend
- React 18
- Bootstrap 5
- SweetAlert2
- Axios para API calls
- React Router
- Context API para estado global

## 📦 Instalación

### Prerrequisitos
- Node.js 16+ 
- MongoDB Atlas account
- Git

### Backend Setup

```bash
cd backend
npm install
```

Configurar variables de entorno en `.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://gabriel:gabriel@bddshakira.l08bhec.mongodb.net/Shakira8Noviembre
JWT_SECRET=your-super-secret-jwt-key-here
DEFAULT_PASSWORD=FTT2025
LOG_LEVEL=info
```

Ejecutar el backend:
```bash
npm run dev  # Para desarrollo
npm start    # Para producción
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev  # Para desarrollo
npm run build # Para producción
```

## 🔐 Autenticación

### Usuario por Defecto
- **Usuario**: admin@shakira.com
- **Contraseña**: FTT2025

### Primer Acceso
- Todos los usuarios deben cambiar su contraseña en el primer acceso
- La contraseña por defecto para nuevos usuarios es "FTT2025"

## 📊 Estructura de Base de Datos

### Colección: users
```javascript
{
  nombre: String,
  usuario: String (email),
  password: String (hashed),
  rol: String (jefe/staff/impresor),
  puntoTrabajo: String,
  primerAcceso: Boolean,
  activo: Boolean,
  creadoPor: ObjectId
}
```

### Colección: FechaUno (tickets)
```javascript
{
  firstName: String,
  lastName: String,
  email: String,
  ticket: String,
  seat: String,
  transactionId: String,
  ticketId: String,
  cedula: String,
  impreso: Boolean,
  fechaImpresion: Date,
  usuarioResponsable: ObjectId,
  puntoTrabajo: String,
  quienRetira: String,
  quienOtro: String,
  celular: String,
  reimpresiones: Array
}
```

### Colección: auditlogs
```javascript
{
  tipo: String,
  usuario: ObjectId,
  ticketId: String,
  transactionId: String,
  puntoTrabajo: String,
  detalles: Object,
  ip: String,
  userAgent: String
}
```

## 🔄 Flujos de Trabajo

### Staff - Impresión de Ticket
1. Seleccionar punto de trabajo
2. Buscar ticket en tabla dinámica
3. Hacer clic en "Imprimir"
4. Llenar formulario obligatorio:
   - ¿Quién retira?
   - Celular
   - ¿Quién? (si es "Otro")
5. Confirmar impresión
6. Ticket queda marcado como impreso

### Impresor - Reimpresión
1. Seleccionar punto de trabajo
2. Ver tickets impresos de su punto
3. Hacer clic en "Reimprimir"
4. Seleccionar motivo de reimpresión
5. Generar enlace de impresión: `www.imprimir/id/{transactionId}`

### Jefe - Dashboard y Gestión
1. Ver estadísticas en tiempo real
2. Filtrar por punto de trabajo y fechas
3. Gestionar usuarios (crear, editar, eliminar)
4. Ver logs de auditoría completos
5. Acceso total a impresión/reimpresión

## 🚦 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login
- `POST /api/auth/change-password` - Cambiar contraseña
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Perfil de usuario

### Usuarios (Solo Jefe)
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Tickets
- `GET /api/tickets` - Listar tickets con filtros
- `GET /api/tickets/stats` - Estadísticas (solo jefe)
- `GET /api/tickets/transaction/:id` - Tickets por transacción
- `POST /api/tickets/:id/print` - Imprimir ticket
- `POST /api/tickets/:id/reprint` - Reimprimir ticket

### Auditoría (Solo Jefe)
- `GET /api/audit` - Logs de auditoría
- `GET /api/audit/summary` - Resumen de auditoría

## 🔒 Seguridad

- Contraseñas hasheadas con bcryptjs
- JWT tokens con expiración
- Rate limiting en todas las rutas
- Helmet para headers de seguridad
- Validación de entrada en frontend y backend
- Control de acceso basado en roles
- Logs de auditoría para trazabilidad

## 📝 Desarrollo

### Estructura del Proyecto
```
shakira-tickets-system/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── scripts/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
└── README.md
```

### Scripts Disponibles

#### Backend
- `npm run dev` - Ejecutar con nodemon
- `npm start` - Ejecutar en producción
- `npm test` - Ejecutar tests

#### Frontend
- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build para producción
- `npm run preview` - Preview del build

## 🐛 Resolución de Problemas

### Problemas Comunes

1. **Error de conexión a MongoDB**
   - Verificar URI en variables de entorno
   - Confirmar credenciales de MongoDB Atlas
   - Verificar whitelist de IPs

2. **Error de autenticación**
   - Verificar JWT_SECRET en variables de entorno
   - Confirmar que el token no ha expirado

3. **Error de permisos**
   - Verificar rol del usuario
   - Confirmar que está autenticado

## 📞 Soporte

Para soporte o dudas sobre el sistema, contactar al equipo de desarrollo.

## 📄 Licencia

Este proyecto es privado y confidencial.
#   P P P _ F T T  
 #   P P P _ F T T  
 #   P P P _ F T T  
 