# Correcciones y Ajustes Post-Cierre

**Actividad N°:** 42
**Fecha:** 26/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 0. Nota de contexto

Al igual que el Día 41, esta actividad corresponde a trabajo solicitado **después del cierre formal del Día 40**: un conjunto de correcciones de interfaz, dos defectos reales encontrados en el módulo de Auditoría/Canje, y un cambio de alcance de negocio (habilitar canje masivo para el rol Staff) pedido explícitamente por el tutor empresarial. Se documenta todo junto porque se realizó en la misma sesión de trabajo.

## 1. Corrección de interfaz (UI/UX)

| Pantalla | Antes | Después |
|---|---|---|
| Login | Mostraba en texto plano la contraseña por defecto del sistema | Se eliminó ese texto de la pantalla de login |
| Barra de navegación superior | El rol del usuario se mostraba como una etiqueta plana de bajo contraste junto al nombre | Rediseñado: avatar circular con inicial del nombre, etiqueta de rol con color por tipo (Jefe/Staff/Impresor), enlaces del menú con estado activo/hover |
| Puntos de Venta | Badges de localidades sin estilo (`badge bg-secondary`); íconos de editar/eliminar invisibles (usaban clases de Bootstrap Icons sin el CDN cargado); confirmación de borrado con el `confirm()` nativo del navegador | Localidades como chips con ícono; botones de editar/eliminar con estilo propio y visibles (se agregó el CDN de Bootstrap Icons en `index.html`); confirmación de borrado con SweetAlert2 |
| Usuarios | Columnas Rol / Estado / Primer Acceso como badges de color | Rediseñadas; confirmación de borrado también migrada a SweetAlert2 |
| Auditoría | Columnas Tipo / Rol como badges poco legibles; filtro de "Tipo" no incluía `canje` ni `canje_masivo` | Rediseñadas; filtro completado con los tipos faltantes |
| Tickets | Indicadores "Conectado / Auto / Sync" ocupando espacio sin utilidad clara para el usuario | Eliminados de la interfaz (la sincronización en tiempo real sigue funcionando, solo se quitó la indicación visual) |
| Tickets → Asiento | Chip con fondo oscuro | Rediseñado como texto tipo monoespaciado |
| Tablas (Usuarios, Auditoría, Tickets) | Ajuste posterior solicitado: los campos de Rol, Estado, Primer Acceso, Tipo y Asiento se veían "encerrados en un cuadro" | Cambiados a texto plano con color, sin fondo ni borde, dentro de las tablas (se mantiene el badge con fondo en los lugares que no son tablas, como el menú superior) |

## 2. Defecto corregido: cabecera de tabla ilegible en Tickets

**Síntoma reportado:** la cabecera de la tabla de Tickets se veía con texto del mismo color que el fondo (ilegible).

**Causa real:** una regla propia en `frontend/src/styles/theme.css` (`.table thead th { background: ... }`) tenía **más especificidad CSS** que la clase `.table-dark` de Bootstrap aplicada a esa cabecera. Ganaba el fondo claro de la regla propia mientras el texto se ponía blanco (por `table-dark`), resultando en texto claro sobre fondo claro.

**Corrección:** se excluyó `.table-dark` de la regla genérica (`.table thead:not(.table-dark) th`) y se agregó una regla explícita de alto contraste para `.table thead.table-dark`, forzando fondo oscuro y texto blanco.

## 3. Defecto corregido: no se detectaba el usuario que realizó el canje

**Síntoma reportado:** en el modal "Información del Canje" (Tickets), el campo "Usuario que Canjea" siempre mostraba "Usuario desconocido".

**Causa real:** el backend guarda el usuario responsable en dos campos del ticket, `usuarioResponsable` y `usuarioCanje` (`ticketController.js`), pero **solo `usuarioResponsable` se popula** (`.populate('usuarioResponsable', 'nombre usuario email')`) en todos los endpoints que listan tickets. El frontend leía `usuarioCanje`, que llegaba como un ObjectId sin poblar, nunca como un objeto con `.nombre`.

**Corrección:** el frontend ahora lee `usuarioResponsable` (el campo que sí viene poblado), que en la práctica contiene el mismo usuario.

## 4. Defecto corregido: registros de IP inconsistentes en Auditoría

**Síntoma reportado:** en la tabla de Auditoría, algunos registros mostraban `::1` y otros mostraban `-` en la columna IP.

**Causas reales identificadas (dos):**

1. **Doble registro de auditoría.** Las rutas `POST /tickets/:id/canje`, `POST /tickets/bulk-canje`, `POST /auth/change-password` y `POST /auth/logout` tenían el middleware `auditLogger(tipo)` **además** de que el propio controlador ya creaba su registro de `AuditLog` con datos completos. Cada acción generaba **dos filas**: una completa (creada por el controlador) y otra incompleta (creada por el middleware, sin `ticketId`/`detalles` porque el `switch` de `auditLogger.js` no contempla esos tipos).
2. **Captura de IP insegura.** El middleware `auditLogger.js` leía `req.ip` dentro de un callback `setImmediate(...)` que se ejecuta **después** de que la respuesta ya fue enviada, momento en el que el socket de la petición puede no conservar de forma confiable esa información.

**Corrección aplicada:**
- Se quitó `auditLogger(...)` de las 4 rutas que ya auditan desde el controlador (`routes/tickets.js`, `routes/auth.js`), dejando un único registro por acción.
- `auditLogger.js` ahora captura `req.ip` y el `User-Agent` de forma síncrona, antes de enviar la respuesta, en vez de dentro del callback diferido.

El `::1` que se veía en algunos registros corresponde a pruebas hechas en `localhost` (dirección de loopback) — comportamiento normal, no un error; en producción (Render) se registra la IP pública real gracias a `trust proxy: 1`, ya configurado en `app.js`.

**Cobertura de regresión:** el archivo `backend/tests/unit/routesAuthorization.test.js` (Día 41) verifica de forma automatizada que estas 4 rutas ya no tienen el middleware duplicado.

## 5. Cambio de alcance de negocio: canje masivo habilitado para Staff

El tutor empresarial solicitó que el rol Staff también pueda realizar canje masivo, no solo canje individual.

**Esto revierte una decisión documentada anteriormente:** la Semana 4 (Día 19), la Semana 7 (Día 33) y el cierre formal (Día 40) registran como incidencia corregida que `bulk-canje` debía estar **restringido solo a Jefe**, por ser "una operación de supervisión" según el diseño original de la Semana 3. Esa restricción ya no aplica: se trata de un cambio de alcance solicitado después del cierre del proyecto, no de una regresión del defecto original.

**Cambio aplicado:** `routes/tickets.js` — `authorize('jefe')` → `authorize('jefe', 'staff')` en `POST /tickets/bulk-canje`.

**Nota de seguridad para el tutor empresarial:** el endpoint de canje masivo no valida que los tickets pertenezcan al punto de trabajo del usuario que hace la petición (la interfaz de Staff ya solo muestra tickets de su propio punto de venta, pero la API en sí no lo restringe). Esta limitación **ya existía igual para el canje individual**, que Staff podía usar desde antes; no es un riesgo nuevo introducido por este cambio, pero queda registrada como pendiente para una futura iteración si se considera necesario reforzarla a nivel de API.

## 6. Nuevas validaciones de formato (celular y nombres)

A pedido del tutor: el campo celular no debe aceptar letras, y los campos de nombre no deben aceptar números. Se aplicó en los dos niveles, backend y frontend, y en todos los formularios que tienen esos campos:

| Campo | Formularios afectados | Regla |
|---|---|---|
| Celular | Canje individual, canje masivo (Tickets) | Solo dígitos, 7 a 15 caracteres |
| Nombre de "quién retira" (opción "Otro") | Canje individual, canje masivo (Tickets) | Solo letras (incluye acentos/ñ), espacios, apóstrofe y guion |
| Nombre de usuario | Alta y edición de usuario (Usuarios) | Misma regla que el nombre de "quién retira" |

- **Frontend:** los campos filtran en vivo los caracteres no permitidos mientras se escribe, y se revalida antes de enviar el formulario.
- **Backend:** `backend/src/utils/validators.js` centraliza `isValidPhone` / `isValidName`; se usan en `ticketController.js` (`canjeTicket`, `bulkCanjeTickets`) y `userController.js` (`createUser`, `updateUser`), devolviendo `400` con un mensaje claro si el formato no es válido. Esto asegura que la validación no dependa únicamente del frontend.
- **Cobertura de pruebas:** `backend/tests/unit/validators.test.js`, `ticketCanjeValidation.test.js` y `userValidation.test.js` (Día 41) cubren estas reglas, incluyendo el caso de que la validación falle **antes** de tocar la base de datos.

No se aplicó esta regla al campo "Nombre" de Puntos de Venta, porque ese campo identifica un punto de venta (p. ej. "Local 2"), no a una persona, y puede contener números de forma legítima.

## 7. Hallazgo abierto, no resuelto en esta sesión

Durante la corrección de validaciones en `userController.js` se detectó que el modelo `User` (`backend/src/models/User.js`) define `rol: { enum: ['jefe', 'staff'] }`, **sin incluir `'impresor'`**, pese a que el resto del sistema (frontend, controladores, guías de rol) sí contempla ese rol. Crear hoy un usuario con `rol: 'impresor'` sería rechazado por la validación de Mongoose. Queda pendiente de decisión del tutor empresarial: agregar `'impresor'` al enum, o confirmar que ese rol ya no se usa y limpiar las referencias restantes.

## 8. Conclusiones del día

Se aplicaron y documentaron las correcciones de interfaz solicitadas, dos defectos reales de datos/auditoría (usuario de canje no detectado, registros de IP inconsistentes por auditoría duplicada), el cambio de alcance de negocio para habilitar canje masivo a Staff con su justificación explícita frente a lo documentado en semanas anteriores, y las nuevas validaciones de formato de celular y nombre en ambos niveles (frontend y backend), con cobertura de pruebas automatizadas del Día 41. Queda un hallazgo abierto (rol `impresor` fuera del enum de `User`) pendiente de decisión.

**Observaciones:** Cambio de alcance de negocio documentado explícitamente por contradecir una decisión previa (bulk-canje para Staff); un hallazgo nuevo queda abierto para la próxima iteración.
