# Diseño de Módulos y Componentes de Software

**Actividad N°:** 13
**Fecha:** 17/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Definir la organización modular del código, tanto en el backend como en el frontend, especificando la responsabilidad de cada módulo y cómo se relacionan entre sí.

## 2. Módulos del Backend

| Módulo | Carpeta | Responsabilidad |
|---|---|---|
| Configuración | `src/config/` | Conexión a MongoDB (`database.js`), logger (`logger.js`), resolución de la colección activa de tickets (`collections.js`) |
| Modelos | `src/models/` | Esquemas Mongoose: `Ticket`, `User`, `PuntoVenta`, `AuditLog` |
| Controladores | `src/controllers/` | Lógica de negocio: `ticketController`, `userController`, `puntoVentaController`, `auditController`, `authController` |
| Rutas | `src/routes/` | Definición de endpoints y composición de middlewares por ruta |
| Middleware | `src/middleware/` | `auth` (JWT), `auditLogger` (registro automático), `collectionSelector` (colección activa), `cache` (respuestas cacheadas) |
| Scripts | `src/scripts/` | Utilidades operativas: `setup.js` (importación completa), `importCSV.js`, `extractLocalidades.js`, `createAdmin.js`, `createIndexes.js` |
| Utilidades | `src/utils/` | Funciones auxiliares: `csvImporter.js`, `ecuadorTime.js` (manejo de zona horaria), `logger.js`, `auditLogger.js` |
| Entrada de la app | `src/app.js` | Configuración de Express, seguridad, CORS, Socket.IO y arranque del servidor |

## 3. Cadena de middlewares por endpoint (diseño de composición)

Ejemplo real de la ruta de canje (`routes/tickets.js`):

```
Request → auth → authorize('jefe','staff') → auditLogger('canje') → canjeTicket (controller) → Response
              │            │                         │                       │
       valida JWT   valida rol permitido    prepara registro de       ejecuta la regla de
                                              auditoría                 negocio y responde
```

Este diseño permite **reordenar o reutilizar** middlewares sin duplicar lógica: por ejemplo, `auth` y `authorize` se reutilizan en todas las rutas protegidas del sistema (tickets, users, audit, puntos-venta).

## 4. Módulos del Frontend

| Módulo | Carpeta | Responsabilidad |
|---|---|---|
| Páginas | `src/pages/` | Una vista funcional por página: `Login`, `Dashboard`, `TicketsPage`, `UsersPage`, `AuditPage`, `PuntosVenta`, `ChangePassword` |
| Componentes | `src/components/` | `Layout` (envoltura general), `Navigation` (barra superior), `ProtectedRoute` (guard de rutas por rol), `RoleBasedRedirect` (redirección según rol tras login), `Unauthorized` |
| Contexto | `src/context/AuthContext.jsx` | Estado global de sesión: usuario autenticado, token, funciones de login/logout |
| Servicios | `src/services/` | `api.js` (cliente Axios con interceptores), `socket.js` (cliente Socket.IO como singleton), `index.js` (agregador) |
| Estilos | `src/styles/theme.css` | Paleta y estilos de marca (colores FTT) |

## 5. Componente `ProtectedRoute` (diseño de control de acceso en frontend)

Actúa como una guarda declarativa alrededor de cada página sensible:

```jsx
<Route path="/dashboard" element={
  <ProtectedRoute roles={['jefe']}>
    <Dashboard />
  </ProtectedRoute>
} />
```

**Responsabilidad:** verificar que exista sesión activa y que el rol del usuario esté incluido en `roles`; si no cumple, redirige a `/login` o `/unauthorized` según corresponda. Este control es complementario al `authorize()` del backend — **la validación real y definitiva ocurre siempre en el servidor**, el frontend solo mejora la experiencia de usuario ocultando opciones no permitidas.

## 6. Servicio `socket.js` (patrón Singleton)

Se diseña como una única instancia (`socketService`) compartida por toda la aplicación, con responsabilidad de:
- Establecer la conexión autenticada con token.
- Unirse a salas (`joinPuntoVenta`, `joinStaff`) según el rol.
- Registrar/limpiar listeners de eventos (`ticket-updated`) evitando fugas de memoria al desmontar componentes.

## 7. Matriz de trazabilidad módulo → requerimiento

| Requerimiento | Módulo(s) responsables |
|---|---|
| RF-01 (login) | `authController`, `middleware/auth`, `AuthContext`, `Login.jsx` |
| RF-02/RF-03 (búsqueda/filtro) | `ticketController.getTickets`, `TicketsPage.jsx` |
| RF-04/RF-05 (canje individual) | `ticketController.canjeTicket`, modelo `Ticket` |
| RF-06 (canje masivo) | `ticketController.bulkCanjeTickets` (bulkWrite) |
| RF-07 (reimpresión) | `ticketController.reprintTicket` |
| RF-08 (auditoría) | `middleware/auditLogger`, `auditController`, modelo `AuditLog` |
| RF-09 (usuarios) | `userController`, `UsersPage.jsx` |
| RF-10 (puntos de venta) | `puntoVentaController`, `PuntosVenta.jsx` |
| RF-11 (dashboard) | `ticketController.getTicketStats`, `Dashboard.jsx` |
| RF-12 (importación CSV) | `scripts/setup.js`, `scripts/importCSV.js`, `utils/csvImporter.js` |
| RF-13 (tiempo real) | Socket.IO en `app.js`, `services/socket.js` |

## 8. Conclusiones del día

Se documentó la organización modular completa del sistema y su matriz de trazabilidad con los requerimientos, evidenciando que cada requerimiento aprobado tiene un módulo concreto responsable de implementarlo.

**Observaciones:** Sin observaciones.
