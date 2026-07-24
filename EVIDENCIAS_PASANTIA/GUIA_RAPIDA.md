# ⚡ GUÍA RÁPIDA - Canje FTT v2.0 (Lumineers)

## 🚀 Comenzar en 5 minutos

### 1. Instalar dependencias
```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configurar .env (Backend)
```bash
cp backend/.env.example backend/.env
# Editar: MONGODB_URI, JWT_SECRET, DEFAULT_PASSWORD
```

### 3. Importar datos del CSV ⭐ (LO MÁS IMPORTANTE)
```bash
cd backend
node src/scripts/setup.js ../../LUMINEERS.csv
cd ..
```

Este script automáticamente:
- ✅ Importa todos los boletos del CSV
- ✅ Extrae localidades únicas (columna "Seat")
- ✅ Crea Punto de Venta con todas las localidades
- ✅ Crea usuario admin

### 4. Iniciar servidores

**Terminal 1 - Backend:**
```bash
cd backend && npm run dev
# → http://localhost:5002
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm run dev
# → http://localhost:5173
```

### 5. Login
- Usuario: `sistema`
- Contraseña: `sistema-inicial`
- Rol: `jefe` (administrador)

---

## 🔑 Cambios Principales

| Cambio | Antes | Después |
|--------|-------|---------|
| Base de datos | Shakira8Noviembre | **Lumineers** |
| Colección | FechaUno, FechaDos, FechaTres | **Lumineers_Canje** |
| Localidades | Hardcodeadas 😞 | **Del CSV automáticamente** 🎉 |
| Cronograma | Si, complejo | **No, simplificado** |

---

## 📁 Localidades Dinámicas

Las localidades se extraen de la **columna "Seat"** del CSV:

```csv
First Name, Last Name, ..., Seat, ...
Anahi, Flor, ..., BLACK BOX, ...
Byron, Pogo, ..., PLATINUM, ...
Maria, Naranjo, ..., BLACK BOX, ...
```

**Sistema detecta automáticamente:**
- BLACK BOX
- PLATINUM

Y las asigna al Punto de Venta "LUMINEERS - General"

---

## 🛠️ Si algo sale mal...

### Error: "Cannot connect to MongoDB"
→ Revisar MONGODB_URI en `.env`

### Error: "CSV file not found"
→ Ruta correcta: `node src/scripts/setup.js ../../LUMINEERS.csv`

### "No aparecen los boletos"
→ Ejecutar: `node src/scripts/listRealTickets.js`

### "Las localidades están vacías"
→ Ejecutar con --force: `node src/scripts/setup.js ../../LUMINEERS.csv --force`

---

## 📚 Archivos importantes

- `backend/.env` → Configuración
- `backend/src/scripts/setup.js` → Importar datos
- `SETUP.md` → Documentación completa
- `CAMBIOS.md` → Qué se modificó

---

## ⚠️ ARCHIVOS A ELIMINAR

El cronograma ya no existe. Puedes eliminar:
```bash
rm backend/src/models/Schedule.js
rm backend/src/controllers/scheduleController.js
rm backend/src/routes/schedule.js
rm frontend/src/pages/SchedulePage.jsx
# (y otros archivos de Schedule listados en CAMBIOS.md)
```

---

## 🎯 ¿Qué sigue?

1. ✅ Ejecuta `setup.js` para importar el CSV
2. ✅ Inicia backend y frontend
3. ✅ Verifica que las localidades aparezcan en "Puntos de Venta"
4. ✅ Comienza a canjear boletos

---

**¡Listo! El sistema está 100% funcional y preparado para Lumineers.**

Para más detalles → Ver `SETUP.md`
