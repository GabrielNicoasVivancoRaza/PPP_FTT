# Corrección de Defectos en Producción (Render) — Login y Sincronización de Canjes

**Actividad N°:** 44
**Fecha:** 28/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 0. Nota de contexto

Tras el despliegue en Render (Días 36-37), se reportó un problema real detectado en el ambiente de producción: el login fallaba con "Credenciales inválidas" incluso usando el correo y contraseña correctos, y en algunos intentos la pantalla se quedaba cargando y luego se ponía completamente en blanco, sin llegar a mostrar ningún mensaje de error. Este documento registra el diagnóstico y la corrección de dos defectos reales encontrados en el flujo de autenticación, ambos activos únicamente en el ambiente desplegado (no se habían manifestado en pruebas locales previas). En la misma sesión de trabajo se reportó un segundo problema, ya con el login funcionando: el estado de "canjeado" de los tickets no se reflejaba de forma consistente en la interfaz ni en los contadores, pese a que la auditoría sí registraba los canjes como exitosos (sección 7).

## 1. Defecto corregido: pantalla en blanco al fallar el login

**Síntoma reportado:** al enviar el formulario de login con datos incorrectos, la página se quedaba cargando unos segundos y luego se veía en blanco, como si se hubiera recargado. El mensaje "Credenciales inválidas" nunca llegaba a mostrarse.

**Causa real:** el interceptor de respuestas de Axios en `frontend/src/services/api.js` trataba **cualquier** respuesta HTTP 401 como "sesión expirada": limpiaba `localStorage` y forzaba `window.location.href = '/login'` (recarga completa del navegador). Esta lógica no distinguía entre un 401 por token expirado en una ruta protegida (caso para el que fue diseñada) y el 401 que el propio endpoint `POST /auth/login` devuelve cuando la contraseña es incorrecta. En ese segundo caso, la recarga forzada de página ocurría antes de que el componente `Login.jsx` pudiera ejecutar su `catch` y renderizar el mensaje de error, resultando en el "parpadeo en blanco" reportado.

**Corrección:** se agregó una excepción explícita en el interceptor (`frontend/src/services/api.js`) para que la limpieza de sesión y la redirección forzada **no** se disparen cuando el 401 proviene de `/auth/login`, dejando que el propio formulario maneje y muestre ese error normalmente.

## 2. Defecto corregido: login rechazado por sensibilidad a mayúsculas

**Síntoma reportado:** el mismo error de "Credenciales inválidas" persistía en algunos intentos aun con contraseña verificada como correcta.

**Causa real:** el modelo `User` (`backend/src/models/User.js`) define el campo `usuario` con `lowercase: true`, por lo que todo usuario se guarda siempre en minúsculas. Sin embargo, `authController.js` buscaba el usuario con `User.findOne({ usuario })`, usando el valor **tal cual** llegaba del formulario, sin normalizar a minúsculas. Si el correo se escribía (o el navegador lo autocompletaba) con alguna letra mayúscula, la búsqueda no encontraba ningún documento y el controlador respondía "Credenciales inválidas" — el mismo mensaje que se usa para contraseña incorrecta, lo que hacía indistinguible este caso del de un password realmente equivocado.

**Corrección:** en `backend/src/controllers/authController.js`, la búsqueda ahora normaliza el valor recibido con `.trim().toLowerCase()` antes de consultar la base de datos, replicando la misma normalización que el schema aplica al guardar.

## 3. Verificación de la base de datos real (descartado: "borrar usuarios")

Ante la persistencia del error, se evaluó como hipótesis borrar la colección `Usuarios` de producción y dejar que el sistema recreara el administrador desde cero. Antes de tomar una acción irreversible, se verificó el contenido real de la base de datos ejecutando `backend/src/scripts/createAdmin.js` de forma local contra la cadena de conexión configurada en Render (script idempotente: si ya existe un usuario con `rol: 'jefe'` no crea nada, solo lista los usuarios existentes).

**Resultado:** la base de datos **sí tenía usuarios reales y válidos** (el administrador con `primerAcceso: false`, más dos usuarios `staff` creados previamente desde el panel). Se descartó por completo la hipótesis de borrar la base de datos — habría destruido cuentas reales sin necesidad, ya que el problema no era la ausencia de usuarios.

**Nota de seguridad:** durante esta verificación, la cadena de conexión de MongoDB Atlas (con credenciales en texto plano) fue compartida directamente en la conversación de trabajo. Queda como pendiente crítico, ya señalado desde el Día 36, **rotar esa contraseña en el panel de MongoDB Atlas** y actualizar `MONGODB_URI` en Render con el nuevo valor.

## 4. Causa raíz real: el frontend apuntaba a un backend distinto y desactualizado

Con la base de datos descartada como causa, se comparó directamente la respuesta del endpoint raíz (`GET /`) de las dos URLs de backend involucradas:

- `https://feelthecanjeftt.onrender.com` (la URL configurada en `VITE_API_URL` del frontend desplegado) → respondió `"Shakira Tickets API - Sistema funcionando correctamente"` y expone una ruta `/api/impresion` que **no existe** en el `backend/src/app.js` actual del repositorio.
- `https://shakira-backend-dioy.onrender.com` (la URL real del servicio backend creado a partir del `render.yaml` vigente) → respondió `"Canje FTT API - Sistema funcionando correctamente"`, coincidiendo exactamente con el mensaje del `app.js` actual.

**Conclusión:** son **dos servicios de Render distintos y activos al mismo tiempo**. `feelthecanjeftt.onrender.com` es un despliegue viejo/abandonado (con una versión anterior del código, previa a que Render renombrara el servicio real a `shakira-backend-dioy` por conflicto de nombre), mientras que el frontend en producción seguía apuntando a esa URL vieja a través de su variable `VITE_API_URL`. Por eso ninguna corrección de código al backend actual (secciones 1 y 2) tenía efecto observable en el ambiente de Render: las peticiones de login nunca llegaban al backend corregido.

**Corrección aplicada (configuración, no código):**
- Se actualizó `VITE_API_URL` en el dashboard de Render del servicio de frontend, apuntándolo a `https://shakira-backend-dioy.onrender.com` (el backend real), y se forzó un nuevo build (variable de Vite, se hornea en tiempo de compilación).
- Se dejó registrado como pendiente evaluar `CORS_ORIGIN` en el backend real para que apunte al dominio real del frontend, y suspender o eliminar el servicio viejo `feelthecanjeftt.onrender.com` para no seguir consumiendo recursos gratuitos de Render sin uso.

## 5. Corrección de configuración: URLs de servicios actualizadas en todo el repositorio

Una vez identificado que `feelthecanjeftt.onrender.com` era un servicio viejo/abandonado, se actualizaron todas las referencias versionadas en el repositorio a las URLs reales de los servicios activos de Render (`https://shakira-backend-dioy.onrender.com` y `https://shakira-frontend-cisn.onrender.com`), para que la configuración versionada deje de apuntar al servicio muerto:

- `render.yaml`: `CORS_ORIGIN` del backend, `VITE_API_URL` del frontend y la ruta de rewrite `/api/*` del frontend.
- `frontend/.env.production`, `frontend/public/_redirects` y `frontend/netlify.toml` (configuración residual de un intento de despliegue en Netlify, no usada por Render pero presente en el repo).
- `frontend/public/debug.html` (página estática de diagnóstico manual).

Estos archivos no afectan por sí solos el valor real usado en producción (ese se controla desde el dashboard de Render, ya corregido en la sección 4), pero mantenerlos desactualizados es una fuente de confusión para cualquiera que lea el repositorio esperando encontrar ahí la URL vigente.

## 6. Defecto corregido: tickets canjeados no se reflejaban en la interfaz ni en los contadores

**Síntoma reportado:** al canjear tickets (probado con dos tickets concretos), el canje quedaba registrado correctamente en Auditoría, pero la fila del ticket en la tabla no se pintaba como canjeada y el contador de "cantidad de canjeados" no coincidía con la cantidad real de tickets canjeados.

**Causa real (confirmada consultando directamente la base de producción):** existen **dos colecciones de MongoDB con los mismos 2697 tickets**: `FechaUno` y `Lumineers_Canje`. Se verificó el estado real de los dos tickets reportados:

```
Ticket 17287991 → FechaUno: canjeado=undefined | Lumineers_Canje: canjeado=true
Ticket 17278138 → FechaUno: canjeado=undefined | Lumineers_Canje: canjeado=true
```

El canje se guardaba correctamente (de ahí que apareciera en Auditoría), pero siempre en la colección `Lumineers_Canje`, porque:
- `backend/src/controllers/ticketController.js` (rutas `/api/tickets/*`, incluido el canje) resuelve el modelo de ticket dinámicamente vía `req.TicketModel`, que apunta a la colección `Lumineers_Canje` (o la que indique la variable `COLLECTION_NAME`, no configurada, por lo que aplica ese valor por defecto).
- `backend/src/controllers/puntoVentaController.js` (rutas `/api/puntos-venta/:id/tickets` y `/api/puntos-venta/staff/tickets` — la forma normal en que Staff y Jefe navegan los tickets al elegir un punto de venta) importaba el modelo `Ticket` de forma fija, apuntado por código a la colección `FechaUno` (ver `backend/src/models/Ticket.js`, línea final: `mongoose.model('Ticket', ticketSchema, 'FechaUno')`).

Como la lectura de la lista de tickets y la escritura del canje terminaban en colecciones distintas, el canje era invisible para cualquier vista que pasara por `puntoVentaController.js` (el flujo normal), aunque sí era visible para el Jefe cuando consultaba "Todas las localidades" (que sí usa `ticketController.js`, la misma colección donde se guardó el canje). Esto explica por qué el sistema "detecta unas cosas y otras no": dependía de qué endpoint atendía esa vista en particular.

**Corrección aplicada:**
- `backend/src/routes/puntoVentaRoutes.js`: se agregó el mismo middleware `selectCollection` que ya usa `tickets.js`, para que ambos routers resuelvan siempre la misma colección activa.
- `backend/src/controllers/puntoVentaController.js`: las seis funciones que consultaban tickets (`getTicketsByPuntoVenta`, `getEstadisticasPuntoVenta`, `getTicketsForStaff`, `checkTicketsChanges`, `checkTicketsChangesForStaff`, `getLocalidadesDisponibles`) ahora usan `req.TicketModel || Ticket` en vez del modelo `Ticket` fijo, igual que ya lo hace `ticketController.js`.
- No se migraron datos: dado que ambas colecciones tenían el mismo total de documentos y `Lumineers_Canje` ya contenía el estado de canje correcto y actualizado, unificar la lectura sobre esa colección fue suficiente para que los canjes ya realizados se vean correctamente, sin tocar la base de datos.
- Se corrió la suite de pruebas existente (`backend/tests/unit`, 38 tests) tras el cambio: los 38 siguen pasando.

**Hallazgo relacionado, no corregido (menor):** cuando un usuario con rol Jefe realiza un canje, el evento de Socket.IO de actualización en tiempo real no llega a ningún otro cliente conectado (ni Staff en otra sesión, ni el mismo Jefe en otra pestaña o dispositivo). Esto ocurre porque `canjeTicket`/`bulkCanjeTickets` (`ticketController.js`) intentan emitir a las salas `punto-venta-${ticket.puntoVenta}` (un campo que no existe en el schema de `Ticket`, siempre `undefined`) y `staff-${req.user.puntoTrabajo}` (que también es `undefined` para el rol Jefe, ya que ese campo solo aplica a Staff). No se corrigió en esta sesión porque requiere resolver a qué punto de venta pertenece un ticket a partir de su localidad (`Seat`), lógica que hoy no existe en ningún punto del código, y una solución apresurada podría introducir un bug nuevo. Queda pendiente para una futura iteración.

## 7. Alcance no cubierto en esta sesión

- No se agregó una prueba automatizada de regresión para el caso de mayúsculas en el login; se recomienda incorporarla en una futura iteración de la suite de pruebas (Día 41).
- Queda pendiente que el tutor confirme, tras el redeploy del frontend con la URL de backend corregida, que el login funciona igual en Render que en localhost.
- Queda pendiente la rotación de la contraseña de MongoDB Atlas (ver sección 3), acción que excede el alcance de este entorno de desarrollo.
- Queda pendiente decidir el destino del servicio de backend viejo (`feelthecanjeftt.onrender.com`): suspenderlo o eliminarlo desde el dashboard de Render.
- Queda pendiente evaluar si la colección `FechaUno`, ahora sin ninguna ruta que la use, debe eliminarse o conservarse como respaldo histórico (decisión del tutor empresarial, involucra borrar datos de producción).
- Queda pendiente corregir el enrutamiento de Socket.IO para que los canjes hechos por un Jefe notifiquen en tiempo real a otras sesiones conectadas (ver hallazgo relacionado en la sección 6).
- No se agregó prueba automatizada de regresión para el bug de colecciones divergentes (sección 6); se recomienda una prueba de integración que verifique que `/api/tickets/:id/canje` y `/api/puntos-venta/:id/tickets` leen y escriben sobre la misma colección.

## 8. Conclusiones del día

Se diagnosticaron y corrigieron dos defectos reales del flujo de login (interceptor de Axios que enmascaraba el error real ante cualquier 401, y búsqueda de usuario sin normalizar mayúsculas/minúsculas), se descartó con evidencia directa la hipótesis de borrar la base de datos de usuarios, y se corrigió la causa raíz real del problema de login en Render: el frontend apuntaba, a través de `VITE_API_URL`, a un servicio de backend viejo y desactualizado en vez del real. Además, en la misma sesión se diagnosticó y corrigió un segundo defecto, independiente del anterior: dos colecciones de MongoDB divergentes (`FechaUno` y `Lumineers_Canje`) causaban que los canjes se guardaran en una colección mientras la interfaz normal los leía de la otra, dejando el estado de canje invisible para Staff y para el Jefe en su flujo habitual. Se unificó el acceso a una sola colección activa en ambos controladores, sin necesidad de migrar datos, y se verificó que la suite de pruebas existente (38 tests) sigue pasando.

**Observaciones:** dos causas raíz distintas encontradas y corregidas en la misma sesión, ninguna de las dos evidente sin comparar directamente el comportamiento observado contra el estado real de la base de datos de producción; quedan pendientes de decisión del tutor empresarial la rotación de credenciales de MongoDB Atlas, el destino del servicio de Render abandonado, y el destino de la colección `FechaUno`.
