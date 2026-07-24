# Presentación de Resultados y Cierre de Actividades

**Actividad N°:** 40
**Fecha:** 24/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo de la reunión

Presentar al tutor empresarial los resultados finales del proyecto de pasantía (Sistema de Canje de Boletos — Canje FTT), cerrando formalmente las 8 semanas de actividades planificadas.

## 2. Participantes

| Nombre | Rol |
|---|---|
| Miguel Vivanco | Tutor Empresarial (FeelTheTickets) |
| Gabriel | Pasante / Desarrollador |

## 3. Resumen del proyecto entregado

**Canje FTT** es un sistema web (MERN: MongoDB, Express, React, Node.js) para la gestión del canje de boletos del evento, que reemplaza la validación manual por un flujo digital con búsqueda, canje individual y masivo, control de acceso por roles, auditoría completa y actualizaciones en tiempo real entre puntos de venta.

## 4. Recorrido por semana (resumen)

| Semana | Enfoque | Resultado principal |
|---|---|---|
| 1 | Inducción y levantamiento de información | Backlog inicial de requerimientos e historias de usuario |
| 2 | Análisis de requerimientos, alcance y planificación técnica | Requerimientos funcionales/no funcionales aprobados, stack definido |
| 3 | Diseño de arquitectura, base de datos y componentes | Arquitectura de 3 capas, modelo de datos, mapa de navegación |
| 4 | Autenticación, usuarios y control de acceso | Módulo de login, gestión de usuarios, RBAC consolidado |
| 5 | Gestión, consulta, validación y canje | Búsqueda, canje individual/masivo, impresión y reimpresión |
| 6 | Auditoría, reportes, dashboard y optimización | Trazabilidad completa, estadísticas, mejoras de rendimiento medidas |
| 7 | Integración, pruebas y validación con usuarios | Sistema verificado en vivo, incidencias corregidas, validado por el tutor |
| 8 | Despliegue, documentación, capacitación y cierre | Configuración de despliegue asegurada, manuales y capacitación entregados |

## 5. Incidencias detectadas y corregidas durante todo el proyecto

| # | Incidencia | Severidad | Estado final |
|---|---|---|---|
| 1 | Canje masivo autorizado también para Staff en el backend | Media | ✅ Corregida |
| 2 | Fallback hardcodeado de localidades de un evento anterior | Alta | ✅ Corregida |
| 3 | Campo de búsqueda de cédula duplicado/muerto | Baja | ✅ Corregida |
| 4 | Doble mecanismo de creación de usuario administrador | Alta | ✅ Corregida |
| 5 | Nombre de servicio del logger con marca de proyecto anterior | Muy baja | ✅ Corregida |
| 6 | Credenciales de MongoDB en texto plano en `render.yaml` | Crítica | ✅ Corregida en el repositorio; **rotación de contraseña en MongoDB Atlas pendiente por parte de la empresa** |

## 6. Entregables finales

- Código fuente del backend y frontend, funcional e integrado.
- Documentación técnica completa (`README.md`, `SETUP.md`, `ARQUITECTURA.md`, changelog).
- Guía de capacitación para el rol Staff.
- Procedimiento documentado de despliegue en Render.
- Evidencia completa del proceso de pasantía (`EVIDENCIAS_PASANTIA/`, Semanas 1 a 8).

## 7. Pendientes que quedan fuera del alcance de esta pasantía

- Rotación de la contraseña de MongoDB Atlas comprometida (acción administrativa externa, responsabilidad de la empresa).
- Ejecución real de la publicación en Render (requiere acceso a la cuenta de la empresa).
- Pruebas de carga con usuarios reales durante un evento en producción.

## 8. Cierre formal

El tutor empresarial confirma que el sistema entregado cumple con los objetivos planteados al inicio de la pasantía: digitalizar y controlar el proceso de canje de boletos, con trazabilidad completa y una experiencia adecuada tanto para el personal Jefe como Staff.

## 9. Acuerdos finales

1. Se da por cerrado el desarrollo correspondiente a esta pasantía.
2. Los pendientes de infraestructura (rotación de credenciales, despliegue real) quedan como responsabilidad de la empresa, con el procedimiento ya documentado para ejecutarlos.
3. Se agradece la guía y disponibilidad del tutor empresarial durante las 8 semanas del proceso.

---

**Firma Pasante:** ______________________
**Firma Tutor Empresarial:** ______________________

**Observaciones generales:** Proyecto cerrado con todos los objetivos funcionales cumplidos; pendientes de infraestructura documentados y transferidos a la empresa.
