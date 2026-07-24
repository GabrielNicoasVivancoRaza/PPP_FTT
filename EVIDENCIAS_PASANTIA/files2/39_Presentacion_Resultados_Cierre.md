# Presentación de Resultados y Cierre de Actividades

**Actividad N°:** 39
**Fecha:** 23/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo de la reunión

Presentar al tutor empresarial los resultados finales del proyecto de pasantía (Sistema de Canje de Boletos — Canje FTT), cerrar formalmente las 8 semanas de actividades planificadas, y documentar las métricas cuantitativas del proyecto y las lecciones aprendidas del proceso.

## 2. Participantes

| Nombre | Rol |
|---|---|
| Miguel Vivanco | Tutor Empresarial (FeelTheTickets) |
| Gabriel | Pasante / Desarrollador |

## 3. Material de presentación preparado

Se preparó un resumen ejecutivo de una página (one-pager) para usar como apoyo durante la presentación, con las métricas más relevantes del proyecto. El contenido de ese resumen se detalla en la Sección 6 de este documento.

## 4. Resumen del proyecto entregado

**Canje FTT** es un sistema web (MERN: MongoDB, Express, React, Node.js) para la gestión del canje de boletos del evento, que reemplaza la validación manual por un flujo digital con búsqueda, canje individual y masivo, control de acceso por roles, auditoría completa y actualizaciones en tiempo real entre puntos de venta.

## 5. Recorrido por semana (resumen)

| Semana | Enfoque | Resultado principal |
|---|---|---|
| 1 | Inducción y levantamiento de información | Backlog inicial de requerimientos e historias de usuario |
| 2 | Análisis de requerimientos, alcance y planificación técnica | Requerimientos funcionales/no funcionales aprobados, stack definido |
| 3 | Diseño de arquitectura, base de datos y componentes | Arquitectura de 3 capas, modelo de datos, mapa de navegación |
| 4 | Autenticación, usuarios y control de acceso | Módulo de login, gestión de usuarios, RBAC consolidado |
| 5 | Gestión, consulta, validación y canje | Búsqueda, canje individual/masivo, impresión y reimpresión |
| 6 | Auditoría, reportes, dashboard y optimización | Trazabilidad completa, estadísticas, mejoras de rendimiento medidas |
| 7 | Integración, pruebas y validación con usuarios | Sistema verificado en vivo, 63 casos de prueba, validado por el tutor |
| 8 | Despliegue, documentación, capacitación y cierre | Configuración de despliegue asegurada, manuales y capacitación entregados |

## 6. Métricas cuantitativas del proyecto

| Métrica | Valor |
|---|---|
| Semanas de desarrollo | 8 |
| Días de trabajo documentados | 40 |
| Horas totales de pasantía | 240 h (40 días × 6 h) |
| Requerimientos funcionales implementados | 13 de 13 (100%) |
| Requerimientos no funcionales implementados | 10 de 10 (100%) |
| Incidencias detectadas durante el desarrollo | 6 |
| Incidencias corregidas en el repositorio | 5 de 6 (1 pendiente de acción externa) |
| Casos de prueba funcionales verificados (Día 32) | 63 (0 fallos) |
| Módulos del sistema entregados | 7 (auth, tickets, usuarios, puntos de venta, auditoría, dashboard, tiempo real) |
| Endpoints de API documentados | 20+ |
| Documentos técnicos producidos | 8 (README, SETUP, ARQUITECTURA, CAMBIOS, 3 docs de funcionalidades, evidencia de pasantía) |
| Guías de capacitación entregadas | 2 (Staff e Impresor) + FAQ |
| Items de deuda técnica registrados | 8 (priorizados en Día 39; 2 con impacto directo en producción) |

## 7. Incidencias detectadas y corregidas durante todo el proyecto

| # | Incidencia | Severidad | Estado final |
|---|---|---|---|
| 1 | Canje masivo autorizado también para Staff en el backend | Media | ✅ Corregida |
| 2 | Fallback hardcodeado de localidades de un evento anterior | Alta | ✅ Corregida |
| 3 | Campo de búsqueda de cédula duplicado/muerto | Baja | ✅ Corregida |
| 4 | Doble mecanismo de creación de usuario administrador | Alta | ✅ Corregida |
| 5 | Nombre de servicio del logger con marca de proyecto anterior | Muy baja | ✅ Corregida |
| 6 | Credenciales de MongoDB en texto plano en `render.yaml` | Crítica | ✅ Corregida en el repositorio; **rotación de contraseña en MongoDB Atlas pendiente por parte de la empresa** |

## 8. Revisión final de RF y RNF con el tutor empresarial

Como parte de la reunión de cierre, se revisó con el tutor empresarial el cumplimiento de cada requerimiento funcional, confirmando que el sistema implementado corresponde a lo acordado en la Semana 2:

| RF / RNF | Descripción breve | Confirmación del tutor |
|---|---|---|
| RF-01 | Autenticación con usuario y contraseña | ✅ Confirmado |
| RF-02 | Cambio de contraseña en primer acceso | ✅ Confirmado |
| RF-03 | Gestión de usuarios (alta, edición, baja) | ✅ Confirmado |
| RF-04 | Control de acceso por roles | ✅ Confirmado |
| RF-05 | Búsqueda de tickets por nombre, cédula o ID | ✅ Confirmado |
| RF-06 | Filtrado de tickets por punto de trabajo (Staff) | ✅ Confirmado |
| RF-07 | Canje individual | ✅ Confirmado |
| RF-08 | Canje masivo (restringido a Jefe) | ✅ Confirmado |
| RF-09 | Impresión y reimpresión con motivo obligatorio | ✅ Confirmado |
| RF-10 | Gestión de Puntos de Venta y localidades | ✅ Confirmado |
| RF-11 | Dashboard con estadísticas en tiempo real | ✅ Confirmado |
| RF-12 | Módulo de auditoría con filtros | ✅ Confirmado |
| RF-13 | Reporte de estadísticas por punto de venta | ✅ Confirmado |
| RNF-01 a RNF-10 | Seguridad, rendimiento, logging, CORS, WebSocket, etc. | ✅ Confirmados (revisados en detalle en Día 35) |

**Resultado:** 13 de 13 RF y 10 de 10 RNF confirmados por el tutor empresarial en la reunión de cierre.

## 9. Entregables finales

- Código fuente del backend y frontend, funcional e integrado.
- Documentación técnica completa (`README.md`, `SETUP.md`, `ARQUITECTURA.md`, changelog) — actualizada en Día 39.
- Archivo `backend/.env.example` como referencia de configuración para futuros despliegues.
- Script `verify_deploy.sh` para verificación post-despliegue automatizada.
- Guías de capacitación para los roles Staff e Impresor, más sección de FAQ.
- Procedimiento documentado de despliegue en Render con plan de rollback.
- Registro de deuda técnica priorizado (6 items).
- Evidencia completa del proceso de pasantía (`EVIDENCIAS_PASANTIA/`, Semanas 1 a 8).

## 10. Lecciones aprendidas del proceso

### Técnicas

- **La validación en vivo tardó menos de lo esperado gracias a la revisión por código.** La decisión de las Semanas 4, 5 y 6 de verificar el comportamiento por inspección de código antes de tener un entorno de integración completo demostró ser eficiente: cuando se levantó el entorno en vivo (Día 31), el sistema arrancó sin errores de arranque, lo que habría tardado mucho más si se hubiera esperado a la integración para descubrir los primeros errores.
- **Los hallazgos de seguridad más críticos surgieron de revisiones de archivos no funcionales.** Las credenciales en `render.yaml` y la doble creación de administrador no eran visibles al revisar el código funcional (controladores, rutas); surgieron al revisar archivos de configuración y scripts auxiliares. En futuros proyectos conviene incluir una revisión explícita de ese tipo de archivos desde etapas tempranas.


### De proceso

- **La recomendación sobre la base de datos de prueba (Día 31) fue acertada pero no se implementó.** La sesión de pruebas funcionales del Día 32 terminó siendo por inspección de código y no contra datos reales, por el riesgo de modificar la base de producción. Para el próximo evento, configurar una base de datos de prueba separada desde el inicio del proyecto eliminaría esta restricción.
- **El feature freeze fue una decisión correcta.** Declarar el congelamiento de funcionalidades en el Día 35 antes de la Semana 8 permitió que los días de despliegue, documentación y capacitación no fueran interrumpidos por solicitudes de cambio de último momento.
- **El rol Impresor quedó parcialmente incompleto.** El sistema contempla el rol Impresor en la interfaz y en las guías de capacitación, pero el modelo `User.js` no lo incluye en su enum. Es el item de deuda técnica con mayor impacto funcional inmediato y debería ser el primero en resolverse en la siguiente iteración.

## 11. Pendientes que quedan fuera del alcance de esta pasantía


- Ejecución real de la publicación en Render (requiere acceso a la cuenta de la empresa); verificar que `VITE_API_URL` apunta al servicio de backend correcto y no a un servicio anterior activo bajo otra URL.
- Resolución del item DT-06: agregar `'impresor'` al enum de roles en `User.js`.
- Resolución del item DT-07: unificar el acceso a las colecciones de tickets (`FechaUno` / `Lumineers_Canje`) para que lectura y escritura de canje operen siempre sobre la misma colección.
- Resolución del item DT-08: corregir el enrutamiento de eventos Socket.IO en los controladores de canje para que las notificaciones en tiempo real lleguen efectivamente a todos los clientes conectados.
- Corrección de la normalización de `usuario` en `authController.js` (`.trim().toLowerCase()` antes del `findOne`) y de la excepción en el interceptor de Axios para el endpoint de login (detectados en la revisión de seguridad del Día 33).
- Pruebas de carga con usuarios reales durante un evento en producción.

## 12. Cierre formal

El tutor empresarial confirma que el sistema entregado cumple con los objetivos planteados al inicio de la pasantía: digitalizar y controlar el proceso de canje de boletos, con trazabilidad completa y una experiencia adecuada tanto para el personal Jefe como Staff. Las métricas del proyecto (13/13 RF, 10/10 RNF, 63 casos de prueba con 0 fallos, 6 incidencias gestionadas) son presentadas y aceptadas como evidencia del trabajo realizado.

## 13. Acuerdos finales

1. Se da por cerrado el desarrollo correspondiente a esta pasantía.
2. Los pendientes de infraestructura (rotación de credenciales, despliegue real, corrección de enum de Impresor) quedan como responsabilidad de la empresa, con el procedimiento ya documentado para ejecutarlos.
3. Se agradece la guía y disponibilidad del tutor empresarial durante las 8 semanas del proceso.
4. Presentación y capacitación básica a usuarios

