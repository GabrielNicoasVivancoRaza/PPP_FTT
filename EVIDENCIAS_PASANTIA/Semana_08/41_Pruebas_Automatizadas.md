# Pruebas Automatizadas del Sistema

**Actividad N°:** 41
**Fecha:** 25/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 0. Nota de contexto

Esta actividad es una **extensión solicitada por el tutor empresarial después del cierre formal del Día 40**. Durante el cierre se dejó documentado que el sistema había sido verificado funcionalmente (Semana 7, Días 31-32) mediante arranque en vivo e inspección de código, pero **sin una suite de pruebas automatizadas real**. El tutor solicitó cerrar ese vacío antes de considerar el ciclo de pruebas completo.

## 1. Objetivo del día

Implementar una suite de pruebas automatizadas real (no manual, no por inspección de código) para los módulos críticos de autorización, validación de canje y validación de usuarios, y verificar contra el código actual las afirmaciones registradas en la documentación de las Semanas 7 y 8.

## 2. Diagnóstico inicial

| Verificación | Hallazgo |
|---|---|
| `backend/package.json` | `jest` y `supertest` ya estaban declarados como `devDependencies` y ya instalados en `node_modules`, con el script `"test": "jest"` configurado |
| Archivos `*.test.js` existentes | **Ninguno.** No existía carpeta `tests/` ni un solo archivo de prueba automatizada |
| Archivos `scripts/test*.js` y `src/scripts/test*.js` | Existen (`testAllFilters.js`, `testEndpoint.js`, `testFilters.js`, `testLogin.js`, `testPuntosVenta.js`, `testSchedule.js`), pero son **scripts manuales** que se ejecutan a mano y requieren conexión real a la base de datos — no son parte de una suite automatizada ni corren con `npm test` |
| Frontend | Sin `vitest` ni ningún runner de pruebas configurado en `package.json` |

**Conclusión del diagnóstico:** el hueco identificado por el tutor era real. Se decide implementar la suite en el backend, donde ya existía la infraestructura (Jest + Supertest) lista para usar.

## 3. Decisión de alcance: sin tocar la base de datos real

Como quedó documentado en la Semana 7 (Día 31, sección 6), la base de datos configurada en `.env` es la **base de datos real de producción** del evento, y ya existía la recomendación explícita de no ejecutar pruebas de escritura contra ella. Esta misma política se aplica aquí: la suite se diseñó para **no requerir ninguna conexión real a MongoDB**, sustituyendo los modelos de Mongoose (`Ticket`, `User`, `AuditLog`) y la librería `jsonwebtoken` por mocks de Jest (`jest.mock(...)`). Esto permite ejecutar `npm test` en cualquier entorno (incluyendo CI) sin riesgo de escribir sobre datos reales del evento.

## 4. Suite implementada (`backend/tests/unit/`)

| Archivo | Qué verifica |
|---|---|
| `validators.test.js` | Las funciones `isValidPhone` / `isValidName` (`src/utils/validators.js`) contra casos válidos e inválidos: letras en celular, números en nombre, longitud, acentos/ñ, apóstrofes, valores vacíos |
| `authMiddleware.test.js` | `authorize()` permite/bloquea según rol (200/403/401); `auth()` rechaza sin token, con token inválido/expirado, con usuario inactivo, y acepta un token válido adjuntando `req.user` |
| `routesAuthorization.test.js` | Inspecciona la pila real de middlewares (`router.stack`) de `routes/tickets.js`, `routes/auth.js` y `routes/users.js` para confirmar que no hay doble registro de auditoría, y ejecuta directamente el middleware `authorize` de `/tickets/bulk-canje` para confirmar que Jefe y Staff pasan y Impresor es bloqueado con 403 |
| `ticketCanjeValidation.test.js` | `canjeTicket` y `bulkCanjeTickets` rechazan celular con letras y nombre con números **antes** de consultar `Ticket.findOne` / `Ticket.find` |
| `userValidation.test.js` | `createUser` y `updateUser` rechazan nombres con números antes de tocar `User.findOne` / antes de guardar (`user.save()` no se llama) |

## 5. Resultado real de la ejecución (`npx jest --verbose`)

```
PASS tests/unit/validators.test.js          (12 tests)
PASS tests/unit/userValidation.test.js       (4 tests)
PASS tests/unit/ticketCanjeValidation.test.js (5 tests)
PASS tests/unit/authMiddleware.test.js       (7 tests)
PASS tests/unit/routesAuthorization.test.js  (10 tests)

Test Suites: 5 passed, 5 total
Tests:       38 passed, 38 total
Time:        ~2.8 s
```

Cobertura medida sobre los dos módulos con mayor lógica pura (`--collectCoverageFrom`):

```
File            | % Stmts | % Branch | % Funcs | % Lines
----------------|---------|----------|---------|--------
middleware/auth.js |  100  |   100    |   100   |   100
utils/validators.js|  100  |   100    |   100   |   100
```

Ambos archivos llegaron a 100% de cobertura de líneas y ramas tras agregar el caso de token inválido/expirado, que faltaba en la primera corrida (91.66% inicial en `auth.js`).

## 6. Verificación cruzada contra la documentación de Semanas 7 y 8

Se contrastó el código actual contra las afirmaciones concretas y verificables registradas en los 10 documentos de las Semanas 7 y 8 (Días 31 a 40), no solo contra el registro de incidencias.

### 6.1 Día 31 — Integración de módulos

| Afirmación | Verificación | Resultado |
|---|---|---|
| Existen los endpoints `GET /health` y `GET /api/health` | Ambos definidos en `src/app.js` | ✅ Confirmado |
| El arranque no depende de un admin automático conflictivo (semanas 4-6) | Cubierto por la verificación del Día 33 más abajo | ✅ Confirmado |

No se re-ejecutó el arranque en vivo contra MongoDB Atlas en esta sesión, siguiendo la misma política ya documentada en este día: evitar operaciones contra la base de datos real de producción fuera de lo estrictamente necesario.

### 6.2 Día 32 — Matriz de pruebas funcionales (Auditoría, Reportes, Dashboard)

Se verificó cada caso nuevo de esta semana directamente contra el código fuente actual (no solo se confió en el "✅ Conforme" ya escrito):

| Caso | Afirmación | Verificación en código | Resultado |
|---|---|---|---|
| PAU-01 | `GET /api/audit` sin ser Jefe → 403 | `routes/audit.js`: `authorize('jefe')` en `/` | ✅ Confirmado |
| PAU-02 | Filtro `?tipo=canje` | `auditController.js`: `if (tipo) query.tipo = tipo` | ✅ Confirmado |
| PAU-03 | Filtro por rango de fechas sobre `createdAt` | `query.createdAt.$gte` / `$lte` | ✅ Confirmado |
| PAU-04 | `/api/audit/summary` devuelve `logsPorTipo`, `logsPorUsuario` (con `$lookup` a `users`) y `logsPorDia` | Los 3 agregados están implementados exactamente así en `getAuditSummary` | ✅ Confirmado |
| PRE-01 | `GET /api/tickets/stats` sin ser Jefe → 403 | `routes/tickets.js`: `authorize('jefe')` en `/stats` | ✅ Confirmado |
| PRE-02 | Filtro `?puntoTrabajo=X` | `getTicketStats`: `if (puntoTrabajo) matchQuery.puntoTrabajo = puntoTrabajo` | ✅ Confirmado |
| PRE-03 | `totalTickets = 0` no genera NaN | `porcentajeCanjeados = totalTickets > 0 ? (...) : 0` | ✅ Confirmado |
| PDA-01 | Dashboard con `stats = null` usa `[0, 0]` por defecto | `Dashboard.jsx`: `stats ? [stats.ticketsCanjeados, stats.ticketsRestantes] : [0, 0]` | ✅ Confirmado |
| PDA-02 | Staff accediendo a `/dashboard` es redirigido a `/unauthorized` | `App.jsx`: `<ProtectedRoute roles={['jefe']}>` envuelve `/dashboard`; `ProtectedRoute.jsx` redirige si el rol no está incluido | ✅ Confirmado |

**Los 9 casos nuevos de esta semana están realmente implementados tal como se documentó.**

### 6.3 Día 33 — Incidencias corregidas

| Afirmación | Verificación | Resultado |
|---|---|---|
| Nombre de servicio del logger corregido | `config/logger.js` → `defaultMeta: { service: 'canje-ftt' }` | ✅ Confirmado |
| Sin campo de búsqueda muerto de cédula | `'Numero de Cedula:'` usado de forma consistente en schema y en los 3 controladores | ✅ Confirmado |
| `database.js` ya no crea admin automáticamente | Sin referencias a `createDefaultAdmin` en `config/database.js` | ✅ Confirmado |
| Sin fallback hardcodeado en `getTicketsForStaff` | Sin coincidencias de localidades hardcodeadas en `puntoVentaController.js` | ✅ Confirmado |
| **`bulk-canje` restringido solo a Jefe** (también reafirmado en Días 19, 35 y 40) | `routes/tickets.js` autoriza `authorize('jefe', 'staff')` | ⚠️ **Ya no aplica** — cambio de alcance de negocio del Día 42, no una regresión |

Hallazgo adicional (no documentado antes, sin relación con lo anterior): el script suelto `src/scripts/createAdmin.js` todavía crea un usuario `admin@shakira.com` si se ejecuta manualmente. No contradice lo documentado (que habla puntualmente de la creación automática desde `config/database.js`, ya eliminada), pero es un script heredado del proyecto anterior, no usado por el flujo actual (`setup.js`), candidato a eliminarse en una futura limpieza.

### 6.4 Día 34 — Validación con el tutor empresarial

Flujos citados en el guion de validación, verificados puntualmente contra el código: el bloqueo de un boleto ya canjeado existe (`canjeTicket`: `if (ticket.canjeado) return res.status(400)...`), y la separación de vistas Jefe/Staff en el menú y en las rutas está implementada (`Navigation.jsx`, `App.jsx`). El resto del contenido de este día es un registro de una reunión con retroalimentación cualitativa del tutor, no afirmaciones de código verificables.

### 6.5 Día 35 — Ajustes finales y checklist de requerimientos

La tabla de verificación de este día repite exactamente las mismas 5 correcciones ya contrastadas en el Día 33 (misma conclusión: 4 confirmadas, 1 ya no aplica por el cambio de alcance del Día 42).

El checklist "RF-01 a RF-13 / RNF-01 a RNF-10 ✅ Implementados y validados" (Día 35) se verificó a fondo contra sus definiciones detalladas de la Semana 2 (`06_Analisis_Requerimientos_Funcionales.md`, `07_Analisis_Requerimientos_No_Funcionales_Seguridad.md`). Resultado completo en la sección 6.12.

### 6.12 Verificación detallada de Requerimientos Funcionales (RF) y No Funcionales (RNF)

Cada regla de negocio específica descrita en la Semana 2 se contrastó contra el código actual, no solo el título del requerimiento.

| ID | Requerimiento | Resultado |
|---|---|---|
| RF-01 | Autenticación JWT; usuario inactivo rechazado | ✅ Confirmado (`authController.js`: `if (!user \|\| !user.activo) return 401`) |
| RF-02 | Búsqueda por nombre/apellido/email/cédula/Ticket ID/Transaction ID, insensible a mayúsculas, `$and`/`$or` | ✅ Confirmado |
| RF-03 | Filtro por punto de trabajo forzado para Staff, **ignorando cualquier valor enviado por el cliente** | ⚠️ **Cumple parcialmente** — ver hallazgo 6.13-A |
| RF-04 | Canje individual: celular obligatorio; "Otro" exige parentesco y nombre; boleto ya canjeado no puede volver a canjearse | ✅ Confirmado |
| RF-05 | Validación de doble canje a nivel de backend que evite condiciones de carrera | ⚠️ **No cumple del todo** — ver hallazgo 6.13-B |
| RF-06 | Canje masivo excluye boletos ya canjeados y los informa aparte; usa `bulkWrite` | ✅ Confirmado (comparte el hallazgo 6.13-B) |
| RF-07 | Reimpresión: solo si ya fue impreso, motivo obligatorio, solo rol Jefe | ✅ Confirmado en backend — ⚠️ ver inconsistencia frontend/backend en hallazgo 6.13-C |
| RF-08 | Auditoría con tipo/usuario/ticket/puntoTrabajo/detalles/IP; un fallo de auditoría no bloquea el canje | ✅ Confirmado |
| RF-09 | Solo Jefe gestiona usuarios; Staff siempre requiere punto de trabajo | ✅ Confirmado (con el hallazgo ya documentado en el Día 42 sobre el rol `impresor` fuera del enum) |
| RF-10 | Localidades disponibles desde valores únicos de `Seat` del CSV, no una lista fija | ✅ Confirmado (`Ticket.distinct('Seat')`) |
| RF-11 | Dashboard solo Jefe; filtra por punto de trabajo y fechas | ✅ Confirmado |
| RF-12 | `Ticket ID` único e indexado; re-importación no duplica | ✅ Confirmado en el flujo oficial (`setup.js`) — ver nota sobre código muerto en hallazgo 6.13-D |
| RF-13 | Evento `ticket-updated` por sala; pausa si el usuario está interactuando | ✅ Confirmado |
| RNF-01 | JWT con expiración de sesión | ✅ Confirmado (`expiresIn: '8h'`) |
| RNF-02 | bcrypt salt 12; contraseña nunca en respuestas | ✅ Confirmado |
| RNF-03 | Control de acceso por rol en cada endpoint sensible | ⚠️ **Cumple parcialmente** — mismo hallazgo 6.13-A |
| RNF-04 | Helmet + lista blanca de CORS | ✅ Confirmado (`app.js`: `helmet()`, whitelist de orígenes + wildcard `*.onrender.com` en producción) |
| RNF-05 | Rate limiting, excluyendo `/health` y `check-changes` | ✅ Confirmado (200 req/min, `skip` exacto como se documentó) |
| RNF-06 | Soportar 10 usuarios concurrentes sin degradación | ⚪ No verificable por revisión estática de código; requiere una prueba de carga real, fuera del alcance de esta sesión |
| RNF-07 | Índices en MongoDB: Ticket ID, Seat, updatedAt, compuestos | ✅ Confirmado (`Ticket.js`: índices únicos y compuestos tal como se documentó) |
| RNF-08 | Auditoría inmutable (sin endpoints de edición/borrado de logs) | ✅ Confirmado (`auditController.js` solo expone `GET`) |
| RNF-09 | Usabilidad bajo presión de tiempo | ⚪ Requisito cualitativo, no verificable por revisión de código |
| RNF-10 | Backend y frontend desplegables independientemente en Render vía variables de entorno | ✅ Confirmado (`render.yaml`: dos servicios separados; uso consistente de `process.env.*`) |

### 6.13 Hallazgos nuevos de esta verificación detallada

**A. RF-03 / RNF-03 — El filtro por punto de trabajo no se aplica en todos los endpoints, solo en algunos.**
`getTickets` (`/api/tickets`) y `getTicketsForStaff` (`/puntos-venta/staff/tickets`) sí fuerzan `req.user.puntoTrabajo` para Staff, tal como exige el requerimiento. Pero `GET /api/puntos-venta/:id/tickets` (`getTicketsByPuntoVenta`, usado por Jefe desde el selector de puntos de venta) **no verifica que el `:id` de la URL corresponda al punto de trabajo del usuario que hace la petición** — la ruta solo exige `auth` (estar logueado), no un rol ni una comprobación de pertenencia. En la interfaz actual, Staff nunca llega a usar esta ruta (usa `/staff/tickets`, que sí está bien protegida), pero **a nivel de API**, un usuario Staff o Impresor autenticado podría llamar directamente a `GET /api/puntos-venta/<id-de-otro-punto>/tickets` y ver boletos de una localidad que no es la suya — justo lo que el requerimiento dice explícitamente que no debe pasar ("se ignora cualquier valor enviado desde el cliente"). El mismo patrón (sin comprobación de pertenencia) se repite en `/:id/tickets/check-changes` y `/:id/estadisticas`.

**B. RF-05 / RF-06 — La protección contra condiciones de carrera no es atómica.**
`canjeTicket` hace `findOne` → valida `if (ticket.canjeado)` → `ticket.save()` en pasos separados (no atómico). Dos peticiones casi simultáneas para el mismo `Ticket ID` (p. ej. dos puntos de trabajo intentando canjear el mismo boleto por error) podrían pasar ambas la validación antes de que la primera guarde, resultando en un doble procesamiento (dos registros de auditoría, posible sobrescritura de datos de quien retira). `bulkCanjeTickets` tiene el mismo problema: el `bulkWrite` actualiza por `_id` únicamente, sin repetir la condición `canjeado: false` en el filtro de la actualización. La forma correcta de garantizar esto de forma atómica sería usar `findOneAndUpdate({ 'Ticket ID': id, canjeado: false }, { $set: {...} })` (para canje individual) y agregar `canjeado: false` al filtro de cada `updateOne` del `bulkWrite` (para el masivo), de modo que MongoDB rechace la segunda actualización a nivel de base de datos en vez de depender de una comprobación previa en JavaScript.

**C. RF-07 — Inconsistencia entre frontend y backend para el rol Impresor.**
El backend (`routes/tickets.js`) solo autoriza `authorize('jefe')` para `POST /tickets/:id/reprint`, tal como exige el requerimiento. Pero el frontend (`TicketsPage.jsx`, función `canPrint`) sí le muestra el botón de reimprimir a un usuario con rol `impresor` (`if (userRole === 'impresor' && ticket.impreso) return true;`). Un usuario Impresor que presione ese botón recibiría un 403 del backend — la función está bien protegida donde importa (el backend), pero la interfaz ofrece una acción que ese rol no puede completar.

**D. RF-12 — Código de importación de CSV duplicado y con un bug si se llegara a usar.**
El flujo oficial documentado (`setup.js`) importa los tickets correctamente. Pero existe un módulo separado, `src/utils/csvImporter.js` (usado por `src/scripts/importCSV.js` y `scripts/init.js`, ninguno de los dos parte del flujo documentado), que mapea las columnas del CSV a nombres de campo distintos a los del schema real (`firstName` en vez de `'First Name'`, `ticketId` en vez de `'Ticket ID'`, etc.). Si alguien ejecutara ese script en vez de `setup.js`, insertaría tickets prácticamente vacíos según el schema real. No contradice el requerimiento (que se cumple por la vía oficial), pero es código muerto/legado con un bug latente que conviene eliminar o corregir para evitar que alguien lo use por error en el futuro.

### 6.6 Día 36 — `render.yaml`

| Afirmación | Verificación | Resultado |
|---|---|---|
| `render.yaml` sin credenciales en texto plano | `MONGODB_URI` usa `sync: false`, sin valor en el archivo | ✅ Confirmado |

### 6.7 Día 37 — Procedimiento de publicación

Es un procedimiento a ejecutar manualmente contra cuentas externas (Render, MongoDB Atlas); no contiene afirmaciones sobre el estado del código que se puedan verificar desde este entorno.

### 6.8 Día 38 — Guía de capacitación para Staff

| Afirmación en la guía | Estado actual | Resultado |
|---|---|---|
| "Esta función (canje masivo) solo está disponible para el rol Jefe" | Desde el Día 42, Staff también puede hacer canje masivo | ⚠️ **Desactualizada** por el mismo cambio de alcance de negocio. La guía impresa que se distribuya al personal de Staff debería actualizarse para reflejar que ahora también pueden usar el canje masivo, si el tutor empresarial confirma que se mantiene el cambio |
| El resto de los pasos (login, búsqueda, canje individual, bloqueo de boleto ya canjeado, cerrar sesión) | Verificado contra el código de Tickets/Login/Navigation | ✅ Confirmado |

### 6.9 Día 39 — Inventario de documentación técnica

| Afirmación | Verificación | Resultado |
|---|---|---|
| `README.md`, `SETUP.md`, `ARQUITECTURA.md`, `CAMBIOS.md`, `OPTIMIZACIONES_BACKEND.md`, `CANJE_MASIVO_Y_MEJORAS_UI.md`, `ACTUALIZACIONES_TIEMPO_REAL.md` existen en la raíz del proyecto y están "✅ Vigente" | Solo `README.md` existe actualmente en la raíz. Los otros 6 archivos **no están en la raíz**; existen copias con el mismo nombre dentro de `EVIDENCIAS_PASANTIA/` | ⚠️ **Desactualizado.** El contenido no se perdió (está en `EVIDENCIAS_PASANTIA/`), pero la afirmación de que son documentos técnicos independientes vigentes en la raíz ya no describe la estructura real del repositorio |
| Único procedimiento válido de creación de admin es `setup.js` | Confirmado en 6.3 | ✅ Confirmado |

### 6.10 Día 40 — Cierre formal

El resumen de incidencias de este día es idéntico al del Día 33/35 (misma conclusión). El resto del documento es un acta de cierre (participantes, acuerdos, firmas), sin afirmaciones de código adicionales que verificar.

### 6.11 Resumen de la verificación

De las afirmaciones concretas y verificables contra el código en los 10 documentos (Días 31-40): **la gran mayoría se confirmó correcta**. Se identificaron 3 desviaciones, todas explicadas y ninguna oculta:

1. `bulk-canje` ya no está restringido solo a Jefe (Días 19/33/35/40) — cambio de alcance de negocio del Día 42.
2. La guía de capacitación de Staff (Día 38) quedó desactualizada por el mismo motivo.
3. Los documentos técnicos listados en el Día 39 ya no viven en la raíz del proyecto, sino dentro de `EVIDENCIAS_PASANTIA/`.

El checklist de RF/RNF del Día 35 sí se verificó en detalle contra sus definiciones de la Semana 2 (sección 6.12), encontrando 4 hallazgos adicionales no documentados antes (sección 6.13): falta de comprobación de pertenencia de punto de trabajo en 3 endpoints de tickets por punto de venta (RF-03/RNF-03), ausencia de actualización atómica que garantice contra condiciones de carrera en canje individual y masivo (RF-05/RF-06), una inconsistencia frontend/backend para el rol Impresor en reimpresión (RF-07), y un módulo de importación de CSV muerto con nombres de campo incorrectos (RF-12). Ninguno de los tres primeros es explotable desde la interfaz actual tal como está construida hoy, pero los tres representan una brecha real entre lo exigido por el requerimiento (aplicado a nivel de API, no solo de interfaz) y lo que el backend garantiza por sí mismo.

## 7. Conclusiones del día

Se cerró el vacío de pruebas automatizadas señalado por el tutor empresarial: el proyecto pasa de depender exclusivamente de verificación manual y por inspección de código a contar con una suite real de 38 pruebas automatizadas, ejecutable con `npm test` sin tocar la base de datos de producción, con 100% de cobertura en los módulos de autenticación/autorización y de validación de formato. La verificación cruzada se extendió a las afirmaciones verificables de los 10 documentos de las Semanas 7 y 8, y adicionalmente al checklist completo de Requerimientos Funcionales y No Funcionales (RF-01 a RF-13, RNF-01 a RNF-10) contra sus definiciones detalladas de la Semana 2. La implementación real coincide con lo documentado en la gran mayoría de los casos. Se identificaron y explicaron 7 desviaciones en total: 3 de contenido/alcance ya conocidas (restricción de `bulk-canje` revertida en el Día 42, guía de capacitación de Staff desactualizada por el mismo motivo, documentos técnicos del Día 39 reubicados fuera de la raíz) y 4 hallazgos técnicos nuevos detectados en esta revisión detallada de RF/RNF: falta de verificación de pertenencia de punto de trabajo en 3 endpoints de tickets por punto de venta, ausencia de actualización atómica contra condiciones de carrera en el canje, una inconsistencia frontend/backend para el rol Impresor en reimpresión, y un módulo de importación de CSV muerto con un bug de nombres de campo.

**Observaciones:** Suite de pruebas automatizadas implementada y verificada (38/38 exitosas); verificación cruzada completa contra los 10 documentos de Semanas 7-8 y el checklist RF/RNF de la Semana 2, con 7 desviaciones detectadas y documentadas, ninguna oculta ni corregida silenciosamente sin registro.
