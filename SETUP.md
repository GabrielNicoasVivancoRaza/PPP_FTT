# 🎫 Canje FTT - Setup & Installation Guide

## Descripción General

Sistema de canje de boletos para conciertos. Utiliza:
- **Base de datos**: MongoDB (Lumineers)
- **Colección**: Lumineers_Canje
- **Localidades**: Se extraen automáticamente del CSV (columna "Seat")
- **Stack**: Node.js + Express (backend), React + Vite (frontend)

---

## 🚀 Instalación Rápida

### 1. **Clonar y navegar al proyecto**
```bash
cd "Canje FTT"
```

### 2. **Instalar dependencias**

#### Backend
```bash
cd backend
npm install
cd ..
```

#### Frontend
```bash
cd frontend
npm install
cd ..
```

### 3. **Configurar variables de entorno**

#### Backend
```bash
# Copiar archivo de ejemplo
cp backend/.env.example backend/.env

# Editar con tus valores
# - MONGODB_URI: Tu conexión a MongoDB Atlas
# - JWT_SECRET: Clave secreta para JWT
# - DEFAULT_PASSWORD: Contraseña inicial del admin
```

#### Frontend
```bash
# Verificar que .env.local esté configurado
cat frontend/.env.local

# Debe contener:
# VITE_API_URL=http://localhost:5002
```

### 4. **Importar datos del CSV**

Este script automatiza la importación y configuración de localidades:

```bash
cd backend
node src/scripts/setup.js ../../LUMINEERS.csv
cd ..
```

**¿Qué hace este script?**
- ✅ Importa todos los tickets del CSV a MongoDB
- ✅ Extrae automáticamente las localidades únicas de la columna "Seat"
- ✅ Crea un Punto de Venta con todas las localidades
- ✅ Crea un usuario admin si no existe

**Opciones:**
```bash
# Importar sin limpiar datos previos (append)
node src/scripts/setup.js ../../LUMINEERS.csv

# Importar eliminando datos previos primero (--force)
node src/scripts/setup.js ../../LUMINEERS.csv --force
```

---

## 🏃 Ejecutar en Desarrollo

### Terminal 1 - Backend
```bash
cd backend
npm run dev
# Servidor corriendo en http://localhost:5002
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
# Aplicación corriendo en http://localhost:5173
```

---

## 📊 Estructura de Datos

### CSV Esperado (LUMINEERS.csv)
```
First Name, Last Name, Email, Ticket, Seat, Transaction ID, Transaction Date (Local), Barcode Data, Ticket ID, Número de Cédula
Anahi, Flor, anahifz29@gmail.com, BLACK BOX, BLACK BOX, 8963169, 01/28/26, ..., 17237508, 1719518019
```

**Columnas importantes:**
- `Seat`: Se convierte automáticamente en las localidades del sistema
- `Ticket ID`: Identificador único del boleto
- `Transaction ID`: ID de la transacción
- Email, Cédula: Información del comprador

### Base de Datos (MongoDB)

#### Colección: `Lumineers_Canje`
```javascript
{
  _id: ObjectId,
  "First Name": "Anahi",
  "Last Name": "Flor",
  "Email": "anahifz29@gmail.com",
  "Ticket": "BLACK BOX",
  "Seat": "BLACK BOX",              // ← Localidad
  "Transaction ID": 8963169,
  "Ticket ID": 17237508,            // ← Único
  "Numero de Cedula:": "1719518019",
  "Transaction Date (Local)": "01/28/26",
  "Barcode Data": "...",
  createdAt: Date,
  updatedAt: Date
}
```

#### Colección: `PuntosVenta`
```javascript
{
  _id: ObjectId,
  nombre: "LUMINEERS - General",
  descripcion: "Concierto Lumineers - 3 localidades",
  localidades: [
    "BLACK BOX",
    "PLATINUM",
    "GENERAL"
  ],
  activo: true,
  creadoPor: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 Usuarios por Defecto

Una vez que se ejecute `setup.js`, se crea automáticamente:
- **Usuario**: `sistema`
- **Contraseña**: `sistema-inicial`
- **Rol**: `jefe` (administrador)

**⚠️ IMPORTANTE**: Cambiar esta contraseña inmediatamente en producción.

---

## 📝 Scripts Disponibles

### Backend
```bash
npm run dev        # Iniciar con nodemon
npm start          # Iniciar en producción
npm test           # Ejecutar tests
```

### Frontend
```bash
npm run dev        # Iniciar dev server
npm run build      # Build para producción
npm run preview    # Preview del build
npm run lint       # Verificar linting
```

### Utilidad Scripts
```bash
# Importar CSV
node src/scripts/setup.js <ruta-csv>

# Verificar tickets importados
node src/scripts/listRealTickets.js

# Validar estructura de tickets
node src/scripts/checkDataTypes.js

# Buscar ticket específico
node src/scripts/findTicket.js <ticket-id>
```

---

## 🔄 Workflow - Canje de Boletos

1. **Login**: Usuario con rol `staff` o `jefe` accede al sistema
2. **Ver Tickets**: Busca y filtra tickets por localidad (Seat)
3. **Canjear Ticket**: Marca el ticket como canjeado
4. **Auditoría**: Todos los canjes quedan registrados

### Roles del Sistema
- **jefe**: Acceso total (dashboard, usuarios, auditoría, cronograma, canje)
- **staff**: Solo puede canjear boletos
- **admin**: No implementado (reserved)

---

## 🐛 Troubleshooting

### Error: "Cannot find module csv-parser"
```bash
cd backend
npm install csv-parser
```

### Error: "MONGODB_URI not configured"
Asegurar que `.env` en backend tenga:
```
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/Lumineers
```

### Los tickets no aparecen
1. Verificar que se ejecutó `setup.js`
2. Confirmar que los datos están en MongoDB:
```bash
node src/scripts/listRealTickets.js
```

### Las localidades están vacías
1. El CSV debe tener la columna `Seat` con datos
2. Ejecutar nuevamente: `node src/scripts/setup.js ../../LUMINEERS.csv --force`

---

## 📚 Cambios Realizados en esta Versión

✅ **Base de datos unificada**: Solo `Lumineers` con colección `Lumineers_Canje`
✅ **Localidades dinámicas**: Se extraen del CSV, no están hardcodeadas
✅ **Schedule removido**: Eliminada toda la lógica de cronogramas
✅ **Setup automatizado**: Un solo comando importa y configura todo
✅ **Frontend simplificado**: Removida página de Schedule

---

## 🚀 Deploy a Render (Producción)

### Backend
1. Push a GitHub
2. Conectar repo en Render
3. Variables de entorno en Render:
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=algo-super-seguro
DEFAULT_PASSWORD=nueva-contraseña
NODE_ENV=production
```
4. Build command: `npm install`
5. Start command: `npm start`

### Frontend
1. Build: `npm run build`
2. Servir desde la carpeta `dist`
3. Variables de entorno:
```
VITE_API_URL=https://tu-backend-en-render.com
```

---

## 📞 Soporte

Para más información sobre el proyecto:
- Revisar archivos `.md` en la raíz del proyecto
- Consultar logs en `backend/logs/`

---

**Última actualización**: Abril 2026
**Versión**: 2.0.0 (Lumineers)
