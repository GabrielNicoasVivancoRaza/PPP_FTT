# 🏗️ Arquitectura del Sistema - Canje FTT v2.0

## 📊 Diagrama General

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CANJE FTT v2.0                               │
│                      (Lumineers Concert)                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐      ┌──────────────────────────────┐
│       FRONTEND (React)        │      │      BACKEND (Node.js)       │
│     http://localhost:5173     │      │     http://localhost:5002    │
├──────────────────────────────┤      ├──────────────────────────────┤
│ • Dashboard                  │      │ • API Routes                 │
│ • Tickets                    │      │ • Controllers                │
│ • Puntos de Venta           │      │ • Middleware                 │
│ • Auditoría                  │      │ • Models                     │
│ • Usuarios                   │      │ • Scripts                    │
│ • (NO Schedule)              │      │ • (NO Schedule)              │
└──────────────────────────────┘      └──────────────────────────────┘
         │                                     │
         │              JSON API               │
         └─────────────────────────────────────┘
                           ▼
        ┌─────────────────────────────────┐
        │    MONGODB - Lumineers DB       │
        ├─────────────────────────────────┤
        │ • Lumineers_Canje (tickets)     │
        │ • Users (usuarios)              │
        │ • PuntosVenta (localidades)     │
        │ • AuditLog (auditoría)          │
        └─────────────────────────────────┘
```

---

## 🗄️ Base de Datos

### Colecciones Activas

```
MongoDB Atlas (Lumineers)
├── Lumineers_Canje
│   ├── _id: ObjectId
│   ├── First Name: "Anahi"
│   ├── Last Name: "Flor"
│   ├── Email: "anahifz29@gmail.com"
│   ├── Ticket: "BLACK BOX"
│   ├── Seat: "BLACK BOX"              ← LOCALIDAD (dinámica)
│   ├── Transaction ID: 8963169
│   ├── Ticket ID: 17237508             ← ÚNICO
│   ├── Numero de Cedula: "1719518019"
│   ├── createdAt: Date
│   └── updatedAt: Date
│
├── Users
│   ├── _id: ObjectId
│   ├── nombre: "string"
│   ├── usuario: "string" (unique)
│   ├── email: "string"
│   ├── password: "string" (hashed)
│   ├── rol: "jefe" | "staff"
│   ├── activo: boolean
│   └── timestamps
│
├── PuntosVenta
│   ├── _id: ObjectId
│   ├── nombre: "LUMINEERS - General"
│   ├── descripcion: "string"
│   ├── localidades: [                  ← DINÁMICAS del CSV
│   │   "BLACK BOX",
│   │   "PLATINUM",
│   │   "GENERAL"
│   │ ]
│   ├── activo: boolean
│   ├── creadoPor: ObjectId (ref User)
│   └── timestamps
│
└── AuditLog
    ├── _id: ObjectId
    ├── user: ObjectId (ref User)
    ├── action: "CREATE" | "UPDATE" | "DELETE"
    ├── collection: "string"
    ├── documentId: ObjectId
    ├── oldValue: {...}
    ├── newValue: {...}
    ├── timestamp: Date
    └── description: "string"
```

---

## 🛣️ Rutas API

### Backend Endpoints

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/change-password
GET    /api/auth/profile

GET    /api/users                    (jefe)
POST   /api/users                    (jefe)
PUT    /api/users/:id                (jefe)
DELETE /api/users/:id                (jefe)

GET    /api/tickets                  (jefe, staff)
POST   /api/tickets/:id/print        (jefe, staff)
POST   /api/tickets/:id/reprint      (jefe)
GET    /api/tickets/stats            (jefe)
GET    /api/tickets/active-collection
GET    /api/tickets/transaction/:id

GET    /api/puntos-venta             (jefe, staff)
POST   /api/puntos-venta             (jefe)
PUT    /api/puntos-venta/:id         (jefe)
DELETE /api/puntos-venta/:id         (jefe)

GET    /api/audit                    (jefe)
GET    /api/audit/summary            (jefe)

❌ /api/schedule                      (REMOVIDO en v2.0)
```

---

## 📱 Frontend Routes

```
/login                    (público)
/                        (redirect a dashboard o tickets)
/dashboard               (jefe)
/tickets                 (jefe, staff)
/puntos-venta           (jefe)
/users                  (jefe)
/audit                  (jefe)
/change-password        (autenticado)

❌ /schedule            (REMOVIDO en v2.0)
```

---

## 🔄 Flujo de Canje

```
┌─────────────────────────────────────────────────────────┐
│              FLUJO DE CANJE DE BOLETOS                  │
└─────────────────────────────────────────────────────────┘

1. USUARIO ACCEDE AL SISTEMA
   ↓
   [Login] → Usuario: "sistema", Password: "sistema-inicial"
   ↓
   [JWT Token] → Válido por sesión
   ↓

2. VISUALIZA TICKETS
   ↓
   [GET /api/tickets] → Listado de boletos sin canjear
   ↓
   [Filtros] → Por localidad (Seat), nombre, cédula, etc.
   ↓

3. BUSCA BOLETO ESPECÍFICO
   ↓
   [Búsqueda] → Nombre, Cédula, Ticket ID
   ↓
   [Resultado] → Muestra datos del boleto
   ↓

4. INICIA CANJE
   ↓
   [Botón Canjear] → Marca como canjeado
   ↓
   [POST /api/tickets/:id/print]
   ↓

5. SISTEMA REGISTRA TODO
   ↓
   [AuditLog] → Quién, cuándo, qué boleto, acción
   ↓

6. BOLETO APARECE COMO CANJEADO
   ↓
   [Dashboard] → Estadísticas actualizadas
   ↓
   [Auditoría] → Registro permanente
```

---

## 📂 Estructura de Carpetas

```
Canje FTT/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          ← Conexión MongoDB
│   │   │   ├── collections.js       ← ✅ SIMPLIFICADO (v2.0)
│   │   │   └── logger.js
│   │   │
│   │   ├── models/
│   │   │   ├── Ticket.js
│   │   │   ├── User.js
│   │   │   ├── PuntoVenta.js        ← ✅ Sin enum (v2.0)
│   │   │   ├── AuditLog.js
│   │   │   └── ❌ Schedule.js        (REMOVIDO)
│   │   │
│   │   ├── controllers/
│   │   │   ├── ticketController.js
│   │   │   ├── userController.js
│   │   │   ├── puntoVentaController.js
│   │   │   ├── auditController.js
│   │   │   └── ❌ scheduleController.js  (REMOVIDO)
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── tickets.js           ← ✅ Sin Schedule (v2.0)
│   │   │   ├── puntoVentaRoutes.js
│   │   │   ├── audit.js
│   │   │   └── ❌ schedule.js        (REMOVIDO)
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── collectionSelector.js ← ✅ SIMPLIFICADO (v2.0)
│   │   │   ├── auditLogger.js
│   │   │   └── cache.js
│   │   │
│   │   ├── scripts/
│   │   │   ├── setup.js             ← ✨ NUEVO (v2.0)
│   │   │   ├── importCSV.js         ← ✅ MEJORADO (v2.0)
│   │   │   ├── extractLocalidades.js ← ✨ NUEVO (v2.0)
│   │   │   ├── listRealTickets.js
│   │   │   ├── findTicket.js
│   │   │   ├── createAdmin.js
│   │   │   ├── createIndexes.js
│   │   │   └── ❌ checkSchedules.js (REMOVIDO)
│   │   │
│   │   ├── utils/
│   │   │   ├── csvImporter.js
│   │   │   ├── database.js
│   │   │   ├── logger.js
│   │   │   ├── auditLogger.js
│   │   │   └── ecuadorTime.js
│   │   │
│   │   └── app.js                   ← ✅ Sin Schedule (v2.0)
│   │
│   ├── .env                         ← ✅ ACTUALIZADO (v2.0)
│   ├── .env.example                 ← ✅ ACTUALIZADO (v2.0)
│   ├── package.json
│   └── nodemon.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Navigation.jsx       ← ✅ Sin Schedule (v2.0)
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── RoleBasedRedirect.jsx
│   │   │   └── Unauthorized.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── TicketsPage.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   ├── AuditPage.jsx
│   │   │   ├── PuntosVenta.jsx
│   │   │   ├── ChangePassword.jsx
│   │   │   └── ❌ SchedulePage.jsx  (REMOVIDO)
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── index.js
│   │   │   └── socket.js
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── App.jsx                 ← ✅ Sin Schedule (v2.0)
│   │   ├── main.jsx
│   │   └── assets/
│   │
│   ├── .env.local
│   ├── package.json
│   └── vite.config.js
│
├── LUMINEERS.csv                   ← Datos de boletos
├── README.md                       ← ✅ ACTUALIZADO (v2.0)
├── GUIA_RAPIDA.md                 ← ✨ NUEVO (v2.0)
├── SETUP.md                       ← ✨ NUEVO (v2.0)
├── CAMBIOS.md                     ← ✨ NUEVO (v2.0)
└── CHECKLIST.md                   ← ✨ NUEVO (v2.0)
```

---

## 🔐 Seguridad & Roles

```
┌─────────────────────────────────────────────┐
│           SISTEMA DE ROLES v2.0             │
└─────────────────────────────────────────────┘

JEFE (Administrador)
├── Acceso total al sistema
├── Dashboard con estadísticas
├── Gestión completa de usuarios
├── Auditoría completa
├── Canje de cualquier boleto
├── Gestión de Puntos de Venta
└── Control de permisos

STAFF (Operador)
├── Visualización limitada de tickets
├── Canje de boletos
├── Búsqueda de boletos
├── Cambio de contraseña
└── NO acceso a usuarios ni auditoría

ADMIN
└── Reserved para futura implementación
```

---

## 🔌 Variables de Entorno

### Backend `.env` (Requeridas)

```env
# Base de datos
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/Lumineers
COLLECTION_NAME=Lumineers_Canje

# Servidor
NODE_ENV=development
PORT=5002

# Seguridad
JWT_SECRET=tu-secret-super-seguro-aqui
DEFAULT_PASSWORD=FTT2025

# Logs
LOG_LEVEL=info

# CORS
CORS_ORIGIN=https://tu-frontend-en-render.com (producción)
```

### Frontend `.env.local` (Requeridas)

```env
VITE_API_URL=http://localhost:5002
```

---

## 📊 Flujo de Localidades (v2.0)

```
┌────────────────────────────────────────────────────┐
│     FLUJO DE LOCALIDADES DINÁMICAS (NUEVO)         │
└────────────────────────────────────────────────────┘

CSV (LUMINEERS.csv)
    │
    └─ Columna "Seat": [BLACK BOX, PLATINUM, GENERAL, ...]
        │
        └─ node src/scripts/setup.js
            │
            ├─ Lee CSV
            │  │
            │  ├─ Extrae valores únicos de Seat
            │  │  └─ Set: {BLACK BOX, PLATINUM, GENERAL}
            │  │
            │  └─ Crea lista: [BLACK BOX, GENERAL, PLATINUM]
            │
            ├─ Importa tickets a MongoDB
            │  └─ Lumineers_Canje collection
            │
            └─ Crea/Actualiza PuntoVenta
               └─ "LUMINEERS - General"
                  └─ localidades: [BLACK BOX, GENERAL, PLATINUM]

Frontend (Puntos de Venta)
    └─ Muestra: LUMINEERS - General
       └─ Localidades: BLACK BOX, GENERAL, PLATINUM ✅
```

**Ventaja**: NO necesitas editar código para agregar nuevas localidades. 
Todo viene del CSV automáticamente.

---

## 🚀 Comando Maestro (v2.0)

```bash
┌─────────────────────────────────────────────┐
│   SETUP AUTOMATIZADO (Línea de comando)     │
└─────────────────────────────────────────────┘

node src/scripts/setup.js ../../LUMINEERS.csv

    ↓
    
┌─────────────────────────────────────────────┐
│  ¿Qué hace setup.js?                        │
├─────────────────────────────────────────────┤
│ 1. Conecta a MongoDB                        │
│ 2. Lee CSV                                  │
│ 3. Extrae localidades únicas                │
│ 4. Importa tickets                          │
│ 5. Crea usuario admin si no existe          │
│ 6. Crea/actualiza PuntoVenta                │
│ 7. Muestra reporte visual                   │
│                                             │
│ TODO EN UN COMANDO ✅                        │
└─────────────────────────────────────────────┘

Con --force:
    └─ node src/scripts/setup.js LUMINEERS.csv --force
       └─ Elimina datos previos antes de importar
```

---

## ✨ Cambios v1.0 → v2.0

```
v1.0 (Shakira)                    v2.0 (Lumineers)
├── DB: Shakira8Noviembre    →    ├── DB: Lumineers ✅
├── 3 Colecciones           →    └── 1 Colección ✅
├── Localidades enum        →        Localidades dinámicas ✅
├── Schedule/Cronograma     →        Removido ✅
├── Setup manual            →        Setup automático ✅
├── Código complejo         →        Código simple ✅
└── Múltiples routers       →        Router único ✅
```

---

**Arquitectura finalizada v2.0**
**Listo para producción ✅**
