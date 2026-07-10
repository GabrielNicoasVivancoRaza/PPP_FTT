# Acta de Revisión y Aprobación de Requerimientos

**Actividad N°:** 10
**Fecha:** 12/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo de la reunión

Cerrar la etapa de análisis de requerimientos, presentando al tutor empresarial el paquete consolidado de la Semana 2 (requerimientos funcionales detallados, no funcionales y de seguridad, alcance y planificación técnica) para su aprobación formal antes de iniciar el diseño de la arquitectura.

## 2. Participantes

| Nombre | Rol |
|---|---|
| Miguel Vivanco | Tutor Empresarial (FeelTheTickets) |
| Gabriel | Pasante / Desarrollador |

## 3. Documentos presentados

- `06_Analisis_Requerimientos_Funcionales.md`
- `07_Analisis_Requerimientos_No_Funcionales_Seguridad.md`
- `08_Definicion_Alcance_Sistema.md`
- `09_Planificacion_Tecnica_Solucion.md`

## 4. Puntos revisados y resultado

| Punto revisado | Resultado |
|---|---|
| Reglas de negocio de cada requerimiento funcional (RF-01 a RF-13) | ✅ Aprobadas sin cambios |
| Priorización de requerimientos funcionales | ✅ Aprobada |
| Requerimientos no funcionales y controles de seguridad (RNF-01 a RNF-10) | ✅ Aprobados |
| Alcance del sistema (in scope / out of scope) | ✅ Aprobado, se ratifica que venta, pagos y facturación quedan fuera del sistema |
| Stack tecnológico y arquitectura propuesta (MERN + Socket.IO + JWT) | ✅ Aprobado |
| Plan de despliegue en Render y manejo de variables de entorno | ✅ Aprobado, con énfasis en no exponer credenciales en el repositorio |
| Planificación de sprints (semanas 3 a 8) | ✅ Aprobada como guía de trabajo |

## 5. Observaciones del tutor empresarial

- Se solicita mantener especial atención al riesgo de doble canje en escenarios de alta concurrencia (varios puntos de venta activos al mismo tiempo), ya cubierto como RNF y regla de negocio de RF-05.
- Se ratifica que cualquier ampliación futura (por ejemplo, soportar más de un evento en simultáneo) se tratará como un requerimiento nuevo, fuera del alcance actual, y deberá pasar por el mismo proceso de validación.

## 6. Acuerdos y siguientes pasos

1. Se aprueba formalmente el cierre de la etapa de análisis de requerimientos.
2. Se autoriza iniciar la Semana 3: diseño de arquitectura del sistema, base de datos y componentes de software.
3. El backlog de requerimientos (funcionales y no funcionales) queda como línea base (*baseline*) para el resto del proyecto.

---
