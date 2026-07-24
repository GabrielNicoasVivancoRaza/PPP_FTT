# 📊 Resumen Detallado - Canje FTT v2.0

## 🛠️ **Tecnologías Utilizadas**

### **Backend**
- **Runtime**: Node.js + Express.js (^4.18.2)
- **Base de Datos**: MongoDB Atlas (Versión Lumineers)
- **Autenticación**: JWT (jsonwebtoken ^9.0.2) + bcryptjs para hashing
- **Validación**: express-validator (^7.0.1)
- **Seguridad**: Helmet (^7.0.0), CORS, Rate Limiting
- **Logging**: Winston (^3.10.0)
- **Tiempo Real**: Socket.io (^4.8.1)
- **Otros**: Multer (carga de archivos), CSV Parser, node-cache
- **Dev**: Nodemon, Jest (testing)

### **Frontend**
- **Framework**: React 18.2.0
- **Bundler**: Vite 4.4.5
- **Routing**: React Router v6
- **UI**: React Bootstrap 2.8.0 + Bootstrap 5.3.0
- **Gráficos**: Chart.js + react-chartjs-2
- **Gestión de Estado**: Context API + React Query (3.39.3)
- **Forms**: React Hook Form (^7.45.4)
- **Alertas**: SweetAlert2
- **Otros**: Axios, date-fns, Socket.io client

---

## 🏗️ **Arquitectura General**

```
┌─────────────────────────────────────────────────────────┐
│              ARQUITECTURA - CANJE FTT                   │
└─────────────────────────────────────────────────────────┘

Frontend (React)          Backend (Express)        MongoDB
   :5173          ←──────────JSON API──────────→  Lumineers DB
- Dashboard              - Controllers           - Lumineers_Canje
- Tickets                - Models                - Users
- Puntos Venta          - Routes                - PuntosVenta
- Auditoría             - Middleware            - AuditLog
- Usuarios              - Scripts
- Auth
```

### **Componentes Principales**

**Backend (`src/`):**
- `app.js` - Configuración principal de Express
- `config/` - Configuración de DB, logger, colecciones
- `models/` - Esquemas Mongoose (Ticket, User, PuntoVenta, AuditLog, Schedule)
- `controllers/` - Lógica de negocio por módulo
- `routes/` - Definición de endpoints API
- `middleware/` - Autenticación, logging, selector de colecciones
- `scripts/` - Importación CSV, setup inicial, utilidades

**Frontend (`src/`):**
- `pages/` - Componentes de página (Dashboard, TicketsPage, etc)
- `components/` - Componentes reutilizables (Layout, Navigation, ProtectedRoute)
- `context/` - Context API para autenticación
- `services/` - Funciones que llaman a la API backend
- `utils/` - Funciones auxiliares

---

## ✨ **Características Generales del Sistema**

### **1. Gestión de Boletos (Tickets)**
- ✅ Canje de boletos con registro completo
- ✅ Búsqueda avanzada (por Ticket ID, Email, Cédula, Nombre)
- ✅ Localidades dinámicas extraídas del CSV
- ✅ Estados de boleto (disponible, canjeado, reprintado)
- ✅ Impresión y reimpresión de boletos
- ✅ Auditoría de todos los cambios

### **2. Gestión de Usuarios**
- ✅ Dos roles: **Jefe** (admin) y **Staff** (operador)
- ✅ Autenticación con JWT
- ✅ Cambio de contraseña
- ✅ Crear, editar, eliminar usuarios
- ✅ Solo Jefe tiene acceso a administración

### **3. Puntos de Venta**
- ✅ Un Punto de Venta principal: **"LUMINEERS - General"**
- ✅ Localidades dinámicas (BLACK BOX, PLATINUM, etc)
- ✅ Las localidades se extraen del CSV automaticamente

### **4. Auditoría**
- ✅ Registro completo de: crear, actualizar, eliminar boletos
- ✅ Quién realizó la acción, cuándo y qué cambios
- ✅ Dashboard con resumen de auditoría

### **5. Dashboard**
- ✅ Estadísticas de canjes
- ✅ Gráficos por localidad
- ✅ Resumen de actividades
- ✅ Acceso solo para Jefe

---

## 🔧 **Detalles Específicos del Sistema**

### **Base de Datos**

**Conexión:**
```
MongoDB: Atlas
Base de datos: Lumineers
Colección principal: Lumineers_Canje
```

**Colecciones:**

| Colección | Documentos |
|-----------|-----------|
| **Lumineers_Canje** | Boletos (campos del CSV) |
| **Users** | Usuarios del sistema |
| **PuntosVenta** | Puntos de venta con localidades |
| **AuditLog** | Registro de auditoría |

**Esquema de Ticket (del CSV):**
```javascript
{
  First Name: "Anahi",
  Last Name: "Flor",
  Email: "anahifz29@gmail.com",
  Ticket: "BLACK BOX",
  Seat: "BLACK BOX",                // ← LOCALIDAD (extraída dinámicamente)
  Transaction ID: 8963169,
  Ticket ID: 17237508,               // ← ÚNICO (clave de búsqueda)
  Numero de Cedula: "1719518019",
  canjeado: false,
  fechaCanjeado: null,
  usuarioCanjeador: null,
  createdAt: Date,
  updatedAt: Date
}
```

### **API Endpoints**

**Autenticación:**
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/change-password
GET  /api/auth/profile
```

**Boletos:**
```
GET    /api/tickets                  (búsqueda, filtros)
POST   /api/tickets/:id/print        (canje y impresión)
POST   /api/tickets/:id/reprint      (reimpresión - solo Jefe)
GET    /api/tickets/stats            (estadísticas)
GET    /api/tickets/active-collection
GET    /api/tickets/transaction/:id
```

**Usuarios:**
```
GET    /api/users                    (solo Jefe)
POST   /api/users                    (crear - Jefe)
PUT    /api/users/:id                (editar - Jefe)
DELETE /api/users/:id                (eliminar - Jefe)
```

**Puntos de Venta:**
```
GET    /api/puntos-venta
POST   /api/puntos-venta             (crear - Jefe)
PUT    /api/puntos-venta/:id         (editar - Jefe)
DELETE /api/puntos-venta/:id         (eliminar - Jefe)
```

**Auditoría:**
```
GET /api/audit                       (solo Jefe)
GET /api/audit/summary               (solo Jefe)
```

### **Rutas del Frontend**

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/login` | Público | Login del sistema |
| `/dashboard` | Jefe | Panel de control con estadísticas |
| `/tickets` | Jefe, Staff | Búsqueda y canje de boletos |
| `/puntos-venta` | Jefe | Gestión de localidades |
| `/users` | Jefe | Gestión de usuarios |
| `/audit` | Jefe | Historial de auditoría |
| `/change-password` | Autenticado | Cambio de contraseña |

### **Flujo de Canje (Proceso Principal)**

```
1. Staff busca boleto por Ticket ID / Email / Cédula
   ↓
2. Sistema muestra detalles del boleto
   ↓
3. Staff verifica identidad del cliente
   ↓
4. Staff presiona "Canjear" (print)
   ↓
5. Sistema:
   - Marca boleto como canjeado ✓
   - Registra fecha/hora y usuario
   - Genera impresión
   - Crea registro en AuditLog
   ↓
6. Boleto canjeado y archivado
```

### **Seguridad**

- ✅ **Hashing de contraseñas**: bcryptjs
- ✅ **Autenticación**: JWT con expiración
- ✅ **Autorización**: Roles basados (Jefe / Staff)
- ✅ **Headers de seguridad**: Helmet
- ✅ **Rate Limiting**: Express rate-limit
- ✅ **CORS**: Configurado
- ✅ **Validación**: express-validator

### **Mejoras en v2.0**

| Aspecto | Cambio |
|--------|--------|
| Base de datos | Shakira → **Lumineers** (específica) |
| Colecciones | Múltiples (Fecha1, 2, 3) → **Una única** |
| Localidades | Hardcodeadas → **Del CSV automáticamente** |
| Cronograma | Complejo → **Removido (simplificado)** |
| Líneas de código | 100+ → **30 líneas** (config/collections.js) |

---

## 📅 **Cronograma de Desarrollo**

| Semana | Fechas | Actividad |
|--------|--------|-----------|
| 1 | 01-05 Jun | Análisis del proceso actual |
| 2 | 08-12 Jun | Análisis de requerimientos |
| 3 | 15-19 Jun | Diseño de BD y estructura |
| 4 | 22-26 Jun | Interfaz usuarios y tickets |
| 5 | 29-03 Jul | Módulo de validación y canje |
| 6 | 06-10 Jul | Control, seguimiento y consulta |
| 7 | 13-17 Jul | Integración y pruebas |
| 8 | 20-24 Jul | Documentación y cierre |

---

## 🎯 **Resumen Final**

**Canje FTT** es un sistema moderno y simplificado para gestionar el canje de boletos del concierto de Lumineers. Utiliza una arquitectura MERN con MongoDB, Express, React y Node.js. El sistema destaca por:

- **Simplicidad**: Una única BD y colección (sin complejidad de múltiples fechas)
- **Dinámico**: Localidades extraídas automáticamente del CSV
- **Seguro**: JWT, roles, auditoría completa
- **Eficiente**: Búsquedas rápidas, impresión directa
- **Auditable**: Registro de cada acción realizada
- **Escalable**: Arquitectura lista para expansión futura
