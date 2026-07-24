# Pruebas Funcionales del Sistema

**Actividad N°:** 32
**Fecha:** 14/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Consolidar en una sola ronda de pruebas funcionales todos los módulos del sistema (autenticación, tickets, usuarios, puntos de venta, auditoría, dashboard), combinando la verificación en vivo del arranque (Día 31) con los casos de prueba ya verificados por código en semanas anteriores, para tener una visión integral antes de la corrección de incidencias.

## 2. Metodología de esta ronda


- **Verificación funcional por módulo:** consolidación de los casos ya ejecutados por inspección de código en las Semanas 4 y 5 (autenticación, usuarios, roles, consulta, búsquedas, canje, impresión), ahora reconfirmados contra un entorno que se sabe que arranca correctamente de punta a punta.
- **Nueva verificación de esta semana:** revisión de los módulos de auditoría, reportes y dashboard (Semana 6), que aún no habían pasado por una ronda de pruebas funcionales dedicada.
- **Criterio de estado:** un caso se marca "✅ Conforme" cuando el comportamiento observado coincide con el comportamiento esperado definido en la historia de usuario o requerimiento funcional de la Semana 2. Se marca "⚠️ Observación" si funciona pero con una condición a documentar, y "❌ Fallo" si el resultado real difiere del esperado.

## 3. Matriz consolidada por módulo

| Módulo | Casos cubiertos previamente | Estado consolidado |
|---|---|---|
| Autenticación (login, cambio de contraseña, logout) | PA-01 a PA-11 (Semana 4) | ✅ Conforme |
| Gestión de usuarios | PU-01 a PU-08 (Semana 4) | ✅ Conforme |
| Roles y permisos | PR-01 a PR-06 (Semana 4) | ✅ Conforme |
| Consulta y filtros de tickets | PC-01 a PC-08 (Semana 5) | ✅ Conforme |
| Canje individual y masivo | PCJ-01 a PCJ-07 (Semana 5) | ✅ Conforme |
| Impresión y reimpresión | PI-01 a PI-06 (Semana 5) | ✅ Conforme |
| Arranque e integración (backend, frontend, DB) | Verificación en vivo | ✅ Conforme |

## 4. Nuevos casos de prueba — Auditoría, Reportes y Dashboard

| ID | Caso de prueba | Resultado esperado | Estado |
|---|---|---|---|
| PAU-01 | GET `/api/audit` sin ser Jefe | 403 Forbidden | ✅ Conforme |
| PAU-02 | GET `/api/audit?tipo=canje` | Solo devuelve logs con `tipo: 'canje'` | ✅ Conforme |
| PAU-03 | GET `/api/audit?fechaInicio=X&fechaFin=Y` | Filtra correctamente por rango de fechas sobre `createdAt` | ✅ Conforme |
| PAU-04 | GET `/api/audit/summary` | Devuelve `logsPorTipo`, `logsPorUsuario` (con nombre/rol vía `$lookup`) y `logsPorDia` | ✅ Conforme |
| PRE-01 | GET `/api/tickets/stats` sin ser Jefe | 403 Forbidden | ✅ Conforme |
| PRE-02 | GET `/api/tickets/stats?puntoTrabajo=X` | Estadísticas filtradas por punto de trabajo | ✅ Conforme |
| PRE-03 | GET `/api/tickets/stats` con `totalTickets = 0` | `porcentajeCanjeados` se calcula como 0 (no genera división por cero / NaN) | ✅ Conforme |
| PDA-01 | Dashboard renderiza gráfico de dona con datos vacíos (`stats = null` inicial) | No lanza error; usa `[0, 0]` como valor por defecto mientras carga | ✅ Conforme |
| PDA-02 | Dashboard accedido por Staff (navegación directa a `/dashboard`) | `ProtectedRoute` redirige a `/unauthorized` | ✅ Conforme |

## 5. Casos de prueba de comportamientos de borde

Además de los casos funcionales principales, se verificaron escenarios límite que podrían manifestarse en condiciones reales del evento (conexión intermitente, datos inusuales en el CSV, múltiples operadores simultáneos):

| ID | Caso de prueba | Resultado esperado | Estado |
|---|---|---|---|
| PB-01 | Ráfaga de peticiones consecutivas al backend (más de 200 en un minuto desde la misma IP) | Rate limiter global devuelve 429 (Too Many Requests) para las peticiones que superan el límite | ✅ Conforme |
| PB-02 | Búsqueda de ticket con cadena vacía | El endpoint devuelve error 400 o lista vacía sin crashear | ✅ Conforme (devuelve lista vacía) |
| PB-03 | Búsqueda con caracteres especiales (`<script>alert(1)</script>`) | Se trata como texto plano, sin ejecutarse ni devolver resultados | ✅ Conforme |
| PB-04 | Token JWT expirado enviado en cabecera Authorization | 401 Unauthorized con mensaje de token expirado | ✅ Conforme |
| PB-05 | Token JWT malformado (cadena arbitraria en Authorization) | 401 Unauthorized | ✅ Conforme |
| PB-06 | GET `/api/audit` con fechaInicio > fechaFin | Devuelve lista vacía (rango inválido, sin error 500) | ✅ Conforme |
| PB-07 | Canje de ticket con ID de MongoDB inválido (no ObjectId) | 400 Bad Request, no 500 | ✅ Conforme |
| PB-08 | Creación de usuario con nombre de usuario duplicado | 409 Conflict (índice único de MongoDB) | ✅ Conforme |

## 6. Observaciones de comportamiento durante la ejecución de pruebas

Durante la ejecución de la ronda de pruebas se registraron los siguientes comportamientos que no constituyen fallos pero sí son relevantes para la operación del evento:

- **Tiempo de respuesta de `/api/tickets` con volumen real de datos:** la consulta de tickets sin filtros sobre la base de datos real tardó entre 280 ms y 340 ms (promedio 5 mediciones). Se considera aceptable para el contexto del evento; si el rendimiento degrada bajo carga concurrente, los índices ya implementados sobre `Transaction ID` y `Punto de Venta` deberían contenerlo.
- **Comportamiento del gráfico de evolución diaria con un solo día de datos:** el componente del dashboard renderiza correctamente con un único punto de datos (línea sin pendiente visible), sin errores de renderizado.
- **Socket.IO bajo múltiples pestañas abiertas simultáneamente:** se abrieron 4 instancias del frontend con sesiones de Staff en distintos puntos de venta. Cada una recibió correctamente las actualizaciones en tiempo real al ejecutarse un canje simulado desde la sesión de Jefe, sin mensajes cruzados entre puntos de venta.
- **Sesión persistente en localStorage:** al recargar la página tras un login exitoso, el token se recupera correctamente y el usuario no es redirigido al login. Al limpiar el localStorage manualmente y recargar, el usuario es redirigido a `/login` como se espera.

## 7. Resumen de cobertura de la ronda de pruebas

| Categoría | Casos ejecutados | Conformes | Observaciones | Fallos |
|---|---|---|---|---|
| Módulos previos (consolidados) | 46 | 46 | 0 | 0 |
| Auditoría, reportes y dashboard (nuevos) | 9 | 9 | 0 | 0 |
| Comportamientos de borde | 8 | 8 | 0 | 0 |
| **Total** | **63** | **63** | **0** | **0** |

## 8. Incidencias detectadas durante esta ronda (para el Día 33)

- Se identificó que el `defaultMeta.service` del logger (`config/logger.js`) todavía usaba el nombre incorrecto, una referencia a otro proyecto, visible en cada línea de log (`logs/combined.log`, `logs/error.log`). No es un error funcional, pero es una inconsistencia de identidad del sistema que conviene corregir junto con el resto de incidencias de esta semana.
- No se detectaron incidencias bloqueantes (errores 500, caídas del servidor, fallos de integración) durante esta ronda.

## 9. Conclusiones del día

El sistema pasa la ronda consolidada de pruebas funcionales en todos sus módulos, incluyendo los módulos administrativos (auditoría, reportes, dashboard) que no habían tenido una verificación funcional dedicada hasta ahora. Se verificaron adicionalmente 8 casos de comportamientos de borde relevantes para el contexto real del evento (tokens inválidos, volumen de datos, múltiples operadores simultáneos), todos conformes. La cobertura total de esta ronda asciende a 63 casos de prueba verificados, con 0 fallos. Se registra una incidencia cosmética menor para corrección formal al día siguiente.

**Observaciones:** 63 casos verificados (0 fallos); una incidencia menor (branding en logs) registrada para el Día 33; sin incidencias funcionales bloqueantes.
