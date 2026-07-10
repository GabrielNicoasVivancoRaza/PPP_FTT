# Optimización de Consultas y Rendimiento

**Actividad N°:** 29
**Fecha:** 09/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Revisar y consolidar las optimizaciones de rendimiento aplicadas al backend, verificando que el sistema soporte el uso concurrente de varios puntos de venta sin degradarse (RNF-06, RNF-07).

## 2. Problemas de rendimiento identificados originalmente

- Error de cast en `checkTicketsChangesForStaff` al intentar buscar un `PuntoVenta` por `ObjectId` cuando `puntoTrabajo` en realidad es un `String` (nombre del punto).
- Ausencia de índices en campos consultados con alta frecuencia (`Ticket`, `updatedAt`).
- Consultas sin límite de tiempo, con riesgo de dejar el servidor colgado ante una consulta lenta.
- Rate limiting demasiado estricto (100 solicitudes cada 15 minutos), que bloqueaba el polling de verificación de cambios.
- Pool de conexiones de MongoDB pequeño para el número de puntos de venta concurrentes esperado.

## 3. Optimizaciones implementadas

| Optimización | Detalle |
|---|---|
| Corrección de búsqueda por nombre | `PuntoVenta.findOne({ nombre: userPuntoTrabajo, activo: true })` en vez de buscar por `_id` |
| Índices agregados al modelo `Ticket` | `Ticket` (localidad), `updatedAt` (desc), compuesto `Ticket + updatedAt`, además de los índices de búsqueda por nombre/email/cédula ya definidos |
| Timeouts explícitos | `.maxTimeMS(10000)` en `find()`, `.maxTimeMS(5000)` en `countDocuments()`, `.maxTimeMS(3000)` en verificaciones ligeras de cambios (`check-changes`) |
| Rate limiting ajustado | De 100 solicitudes/15 min a 200 solicitudes/minuto, excluyendo explícitamente `/check-changes` y `/health` |
| Configuración de conexión MongoDB | `maxPoolSize: 20`, `minPoolSize: 5`, `retryReads: true`, `retryWrites: true`, `connectTimeoutMS`, `heartbeatFrequencyMS`, IPv4 forzado (`family: 4`) |
| Consultas en paralelo | `Promise.all` para ejecutar la búsqueda de documentos y el conteo total de forma simultánea, en vez de secuencial |
| Uso de `.lean()` | En todas las consultas de solo lectura (listados de tickets, verificación de cambios), evitando hidratar documentos Mongoose completos innecesariamente |
| Manejo de errores de timeout | Respuesta `503` con `retry: true` cuando una consulta excede su tiempo máximo, en vez de un error genérico `500` |
| Caché en memoria (`node-cache`) | Middleware `cacheMiddleware` con dos niveles de TTL (5 min general, 1 min para datos que cambian rápido) e invalidación selectiva por patrón (`invalidateCache`) |

## 4. Resultados medidos (según seguimiento del equipo)

| Métrica | Antes | Después | Mejora |
|---|---|---|---|
| Tiempo de respuesta de queries | 2-5 s | 0.5-1 s | ~75% |
| Solicitudes bloqueadas por rate limit | ~20% | <1% | ~95% |
| Cuelgues del servidor | Frecuentes | Casi nulos | ~98% |
| Uso de memoria | Alto | Moderado | ~35% |
| Consultas por segundo soportadas | ~10 | ~30-40 | ~300% |

## 5. Verificación de índices

Se cuenta con un script dedicado (`backend/src/scripts/createIndexes.js`) que crea (o verifica) los índices necesarios, incluyendo un índice de texto compuesto sobre nombre, apellido, email, localidad, Ticket ID, Transaction ID y cédula, útil como respaldo cuando la búsqueda por regex no es suficiente.

## 6. Conclusiones del día

El sistema queda optimizado para el escenario real de uso (varios puntos de venta consultando y canjeando de forma concurrente durante el evento), con mejoras medibles en tiempo de respuesta, estabilidad ante consultas lentas y capacidad de solicitudes por segundo.

**Observaciones:** Sin observaciones.
