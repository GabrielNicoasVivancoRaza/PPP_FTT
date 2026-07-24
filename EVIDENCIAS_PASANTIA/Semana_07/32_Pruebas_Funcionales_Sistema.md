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

- **Verificación en vivo (Día 31):** arranque de backend + frontend + conexión real a MongoDB Atlas, endpoints de salud.
- **Verificación funcional por módulo:** consolidación de los casos ya ejecutados por inspección de código en las Semanas 4 y 5 (autenticación, usuarios, roles, consulta, búsquedas, canje, impresión), ahora reconfirmados contra un entorno que se sabe que arranca correctamente de punta a punta.
- **Nueva verificación de esta semana:** revisión de los módulos de auditoría, reportes y dashboard (Semana 6), que aún no habían pasado por una ronda de pruebas funcionales dedicada.

## 3. Matriz consolidada por módulo

| Módulo | Casos cubiertos previamente | Estado consolidado |
|---|---|---|
| Autenticación (login, cambio de contraseña, logout) | PA-01 a PA-11 (Semana 4) | ✅ Conforme |
| Gestión de usuarios | PU-01 a PU-08 (Semana 4) | ✅ Conforme |
| Roles y permisos | PR-01 a PR-06 (Semana 4) | ✅ Conforme |
| Consulta y filtros de tickets | PC-01 a PC-08 (Semana 5) | ✅ Conforme |
| Canje individual y masivo | PCJ-01 a PCJ-07 (Semana 5) | ✅ Conforme |
| Impresión y reimpresión | PI-01 a PI-06 (Semana 5) | ✅ Conforme |
| Arranque e integración (backend, frontend, DB) | Verificación en vivo (Día 31) | ✅ Conforme |

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

## 5. Incidencias detectadas durante esta ronda (para el Día 33)

- Se identificó que el `defaultMeta.service` del logger (`config/logger.js`) todavía usaba el nombre `'shakira-tickets'`, una referencia al proyecto anterior, visible en cada línea de log (`logs/combined.log`, `logs/error.log`). No es un error funcional, pero es una inconsistencia de identidad del sistema que conviene corregir junto con el resto de incidencias de esta semana.
- No se detectaron incidencias bloqueantes (errores 500, caídas del servidor, fallos de integración) durante esta ronda.

## 6. Conclusiones del día

El sistema pasa la ronda consolidada de pruebas funcionales en todos sus módulos, incluyendo los módulos administrativos (auditoría, reportes, dashboard) que no habían tenido una verificación funcional dedicada hasta ahora. Se registra una incidencia cosmética menor para corrección formal al día siguiente.

**Observaciones:** Una incidencia menor (branding en logs) registrada para el Día 33; sin incidencias funcionales bloqueantes.
