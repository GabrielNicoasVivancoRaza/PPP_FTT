# Configuración del Entorno de Desarrollo y Repositorio GitHub

**Actividad N°:** 16
**Fecha:** 22/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Dejar preparado el entorno de desarrollo local y confirmar el flujo de trabajo sobre el repositorio del proyecto en GitHub, como base para iniciar el desarrollo de los módulos de autenticación, usuarios y control de acceso.

## 2. Repositorio del proyecto

El proyecto se gestiona en un repositorio GitHub ya creado para FeelTheTickets (Canje FTT). El flujo de trabajo adoptado es:

- Commits descriptivos por cambio funcional (no por archivo suelto).
- Uso de `.gitignore` ya definido en el proyecto para excluir `node_modules/`, archivos `.env`, `dist/`, logs y artefactos temporales — evitando exponer credenciales o dependencias pesadas en el repositorio.
- Variables sensibles (`MONGODB_URI`, `JWT_SECRET`, `DEFAULT_PASSWORD`) manejadas exclusivamente vía archivos `.env` locales (no versionados) y variables de entorno del proveedor de despliegue (Render) en producción.

## 3. Entorno de desarrollo local

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurar: MONGODB_URI, JWT_SECRET, DEFAULT_PASSWORD, PORT=5002
npm run dev   # nodemon, recarga automática
```

### Frontend
```bash
cd frontend
npm install
# frontend/.env.local → VITE_API_URL=http://localhost:5002
npm run dev   # servidor Vite en http://localhost:5173
```

### Datos de prueba
```bash
cd backend
node src/scripts/setup.js ../../LUMINEERS.csv
```
Este comando importa el CSV del evento, extrae las localidades y crea el punto de venta y el usuario administrador inicial (`sistema` / `sistema-inicial`).

## 4. Verificación del entorno

| Verificación | Resultado esperado |
|---|---|
| `GET /health` | `{ status: 'OK' }` — backend arriba |
| `GET /api/health` | `{ status: 'API_OK' }` — API respondiendo con CORS correcto |
| Conexión a MongoDB Atlas | Log de conexión exitosa en consola/Winston |
| Frontend en `localhost:5173` | Pantalla de Login visible con logo FeelTheTickets |

## 5. Convenciones adoptadas para el desarrollo de esta semana

- Los cambios de backend relacionados con autenticación/roles se concentran en `middleware/auth.js`, `controllers/authController.js`, `controllers/userController.js` y los archivos de `routes/`.
- Cualquier ajuste de permisos por rol debe reflejarse en **ambos lados**: el middleware `authorize()` del backend (control real) y el componente `ProtectedRoute`/menú de `Navigation.jsx` del frontend (experiencia de usuario), evitando repetir la inconsistencia detectada en la revisión de diseño de la Semana 3.

## 6. Conclusiones del día

El entorno de desarrollo queda operativo (backend + frontend + base de datos con datos de prueba) y el flujo de trabajo sobre el repositorio queda confirmado, permitiendo iniciar el desarrollo del módulo de autenticación al día siguiente.

**Observaciones:** Sin observaciones.
