# Ajustes Finales del Sistema

**Actividad N°:** 35
**Fecha:** 17/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Aplicar los últimos ajustes menores derivados de la validación del día anterior, declarar el congelamiento de funcionalidades (feature freeze) del sistema, y realizar una revisión formal requerimiento por requerimiento del backlog de la Semana 2 para documentar con evidencia concreta el criterio de aceptación cumplido por cada uno, completando así el cierre técnico del ciclo de desarrollo.

## 2. Ajustes aplicados a partir de la retroalimentación del tutor

| Pendiente de la validación (Día 34) | Acción tomada |
|---|---|
| Preparar guía visual simple para el rol Staff | Programado como entregable formal del Día 38 (Capacitación básica a usuarios), borrador v0.1 iniciado en el Día 34 |
| Documentar claramente las credenciales iniciales del sistema | Programado como parte del manual técnico del Día 39, incorporando el hallazgo de la Semana 6 sobre el flujo correcto de creación de administrador (`setup.js` como única fuente) |

No se identificaron ajustes de código adicionales derivados de la validación, ya que la retroalimentación fue exclusivamente sobre documentación y capacitación, no sobre comportamiento del sistema.

## 3. Regresión final antes del feature freeze

Se realizó una revisión de cierre para confirmar que el conjunto completo de correcciones aplicadas durante el proyecto permanece consistente entre sí:

| Verificación | Resultado |
|---|---|
| `bulk-canje` restringido a Jefe (Semana 4) | ✅ Se mantiene |
| Sin fallback hardcodeado en `getTicketsForStaff` (Semana 5) | ✅ Se mantiene |
| Sin campo de búsqueda muerto de cédula (Semana 5) | ✅ Se mantiene |
| Un único mecanismo de creación de administrador vía `setup.js` (Semana 6) | ✅ Se mantiene |
| Nombre de servicio del logger corregido (Semana 7) | ✅ Se mantiene |
| Sin valores hardcodeados de eventos anteriores en frontend (verificado en Día 33) | ✅ Se mantiene |
| Arranque de backend y frontend sin errores (verificado en vivo, Día 31) | ✅ Se mantiene |

## 4. Declaración de "feature freeze"

A partir de este día, se declara el **congelamiento de funcionalidades** (feature freeze) del sistema para el evento actual: no se incorporarán nuevos requerimientos ni cambios de alcance antes del despliegue. Cualquier solicitud adicional del tutor empresarial a partir de este punto se documentará como un requerimiento para una futura iteración, siguiendo el mismo proceso de validación usado desde la Semana 1.

## 5. Revisión formal de Requerimientos Funcionales (RF) — criterio de aceptación por RF

La siguiente tabla documenta el criterio concreto de aceptación verificado para cada requerimiento funcional del backlog de la Semana 2:

| RF | Descripción | Criterio de aceptación verificado | Semana de implementación |
|---|---|---|---|
| RF-01 | Autenticación con usuario y contraseña | Login correcto redirige según rol; credenciales incorrectas devuelven error sin revelar cuál campo es incorrecto | Semana 4 |
| RF-02 | Cambio de contraseña obligatorio en primer acceso | `primeraVez: true` en el usuario fuerza redirección a pantalla de cambio antes de acceder a cualquier ruta | Semana 4 |
| RF-03 | Gestión de usuarios (alta, edición, baja) | CRUD completo funcional; baja lógica (no eliminación física) verificada | Semana 4 |
| RF-04 | Control de acceso por roles (Jefe / Staff / Impresor) | `ProtectedRoute` en frontend + middleware `authorize()` en backend verificados en Día 32 (casos PR-01 a PR-06) | Semana 4 |
| RF-05 | Búsqueda de tickets por nombre, cédula o Ticket ID | Casos PC-01 a PC-08 verificados; búsqueda parcial y por múltiples campos confirmada | Semana 5 |
| RF-06 | Visualización de tickets filtrada por punto de trabajo (Staff) | `getTicketsForStaff` devuelve solo localidades del Punto de Venta del Staff autenticado; sin fallback tras corrección de Semana 5 | Semana 5 |
| RF-07 | Canje individual de tickets | Casos PCJ-01 a PCJ-04 verificados; formulario con "quién retira", bloqueo de doble canje, confirmación visual en verde | Semana 5 |
| RF-08 | Canje masivo de tickets | Casos PCJ-05 a PCJ-07 verificados; restringido a Jefe tras corrección de Semana 4 | Semanas 4–5 |
| RF-09 | Impresión y reimpresión de tickets con motivo | Casos PI-01 a PI-06 verificados; reimpresión requiere campo de motivo obligatorio | Semana 5 |
| RF-10 | Gestión de Puntos de Venta y sus localidades | CRUD completo de puntos de venta y asignación de localidades verificado en validación del Día 34 | Semana 6 |
| RF-11 | Dashboard con estadísticas en tiempo real | Casos PDA-01 y PDA-02 verificados; gráfico de dona y evolución diaria; actualización vía Socket.IO | Semana 6 |
| RF-12 | Módulo de auditoría con filtros | Casos PAU-01 a PAU-04 verificados; filtro por tipo, usuario y rango de fechas; acceso exclusivo a Jefe | Semana 6 |
| RF-13 | Reporte de estadísticas por punto de venta | Casos PRE-01 a PRE-03 verificados; cálculo de porcentaje de canje sin división por cero | Semana 6 |

**Total: 13 de 13 requerimientos funcionales verificados con criterio de aceptación documentado.**

## 6. Revisión formal de Requerimientos No Funcionales (RNF) — criterio de aceptación por RNF

| RNF | Descripción | Criterio de aceptación verificado |
|---|---|---|
| RNF-01 | Tiempo de respuesta de endpoints < 500 ms bajo carga normal | Baseline medido en Día 31: promedio de 7–10 ms en local; se espera < 300 ms en producción con Render activo |
| RNF-02 | Autenticación basada en JWT con expiración configurada | Token firmado con `JWT_SECRET`; expiración verificada en caso PB-04 (Día 32): token expirado devuelve 401 |
| RNF-03 | Rate limiting en endpoints de autenticación | Caso PB-01 (Día 32): 5 intentos fallidos consecutivos devuelven 429 |
| RNF-04 | Encabezados de seguridad HTTP (Helmet) | Verificados al arrancar el servidor en Día 31; respuesta de `/health` incluye `X-Content-Type-Options`, `X-Frame-Options`, etc. |
| RNF-05 | CORS restringido al dominio del frontend | Verificación explícita realizada en Día 31 (Sección 9): orígenes no autorizados no reciben `Access-Control-Allow-Origin` |
| RNF-06 | Logging estructurado de eventos del sistema | Logs verificados en Día 31 (arranque) y Día 33 (nombre de servicio corregido); formato JSON con campos `level`, `message`, `service`, `timestamp` |
| RNF-07 | Actualizaciones en tiempo real entre puntos de venta vía WebSocket | Socket.IO verificado en Día 31 y en ronda de pruebas de Día 32 (múltiples clientes simultáneos) |
| RNF-08 | Contraseñas almacenadas con hash (bcrypt) | Verificado por inspección de código en `User.js`: `pre('save')` aplica `bcrypt.hash` antes de persistir |
| RNF-09 | Índices de base de datos para campos de búsqueda frecuente | Índices verificados en log de arranque del Día 31: `Transaction ID`, `usuario`, `nombre` de PuntoVenta |
| RNF-10 | Variables de entorno para toda configuración sensible | Sin valores hardcodeados de producción en el código fuente tras corrección de `render.yaml` (pendiente Semana 8); frontend usa `import.meta.env.VITE_API_URL` |

**Total: 10 de 10 requerimientos no funcionales verificados con criterio de aceptación documentado.**

## 7. Estado final del backlog de requerimientos

| Categoría | Total | Estado |
|---|---|---|
| Requerimientos funcionales (RF-01 a RF-13) | 13 | ✅ Implementados y validados con criterio documentado |
| Requerimientos no funcionales (RNF-01 a RNF-10) | 10 | ✅ Implementados y validados con criterio documentado |
| Incidencias detectadas durante el desarrollo | 5 | ✅ Corregidas (1 pendiente de infraestructura: credenciales en `render.yaml`) |

## 8. Registro de deuda técnica identificada al cierre del desarrollo

Durante la revisión de los RNF y el cierre del backlog, se formalizó el siguiente registro de deuda técnica conocida al momento del feature freeze. Estas observaciones no impiden la puesta en marcha del sistema pero deben considerarse en una futura iteración:

| # | Descripción | Origen | Prioridad sugerida |
|---|---|---|---|
| DT-01 | Auditoría potencialmente duplicada en rutas de canje y reimpresión (middleware + controlador) | Revisión extendida, Día 33 | Media |
| DT-02 | El endpoint de canje (individual y masivo) no valida que el ticket pertenezca al punto de trabajo del Staff autenticado a nivel de API | Diseño de la Semana 3 (decisión consciente) | Media |
| DT-03 | Credenciales de MongoDB expuestas en historial de Git de `render.yaml`; requiere rotación en Atlas | Semana 2 / Día 36 (pendiente activo) | Alta |
| DT-04 | No existe suite de pruebas automatizadas; toda la verificación fue manual o por inspección de código | Alcance de la pasantía | Media |

## 9. Conclusiones del día

El sistema queda en estado de congelamiento de alcance, con todos los requerimientos funcionales y no funcionales verificados con criterio de aceptación documentado requerimiento por requerimiento (13 RF + 10 RNF), y con un registro formal de deuda técnica que transparenta las decisiones de diseño y las limitaciones conocidas al cierre del ciclo. Los únicos pendientes activos (guía de capacitación, manual técnico, rotación de credenciales de despliegue) quedan programados explícitamente para la Semana 8.

**Observaciones:** Sistema en feature freeze; 13 RF y 10 RNF verificados con criterio documentado; 4 items de deuda técnica registrados para futuras iteraciones.
