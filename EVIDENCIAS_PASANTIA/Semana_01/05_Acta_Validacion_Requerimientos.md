# Acta de Validación de Requerimientos

**Actividad N°:** 5
**Fecha:** 05/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo de la reunión

Presentar al tutor empresarial el backlog de requerimientos funcionales, no funcionales e historias de usuario levantado durante la semana, para su revisión, retroalimentación y aprobación antes de iniciar la etapa de diseño.

## 2. Participantes

| Nombre | Rol |
|---|---|
| Miguel Vivanco | Tutor Empresarial (FeelTheTickets) |
| Gabriel | Pasante / Desarrollador |

## 3. Documentos presentados

- `02_Analisis_Proceso_Venta_Canje.md` — Análisis del proceso actual (AS-IS)
- `03_Levantamiento_Informacion_Flujo_Operativo.md` — Flujo operativo del evento
- `04_Requerimientos_Historias_Usuario.md` — Requerimientos funcionales, no funcionales e historias de usuario

## 4. Requerimientos revisados

| ID | Requerimiento (resumen) | Estado |
|---|---|---|
| RF-01 | Login con roles (Jefe/Staff) | ✅ Aprobado |
| RF-02 | Búsqueda de boletos por nombre/cédula/email/ticket | ✅ Aprobado |
| RF-03 | Filtro por localidad y punto de trabajo | ✅ Aprobado |
| RF-04 | Canje individual con datos de quien retira | ✅ Aprobado |
| RF-05 | Bloqueo de doble canje | ✅ Aprobado |
| RF-06 | Canje masivo (grupos/empresas) | ✅ Aprobado |
| RF-07 | Reimpresión con motivo, solo Jefe | ✅ Aprobado |
| RF-08 | Auditoría completa de operaciones | ✅ Aprobado |
| RF-09 | Gestión de usuarios (solo Jefe) | ✅ Aprobado |
| RF-10 | Gestión de puntos de venta y localidades dinámicas | ✅ Aprobado |
| RF-11 | Dashboard de estadísticas | ✅ Aprobado |
| RF-12 | Importación automática desde CSV | ✅ Aprobado |
| RF-13 | Actualización en tiempo real (WebSockets) | ✅ Aprobado |
| RNF-01 a RNF-08 | Seguridad, rendimiento, disponibilidad, usabilidad | ✅ Aprobados sin observaciones |

## 5. Observaciones del tutor empresarial

- Se confirma que las localidades **no deben estar fijas en el código**, ya que cada evento (concierto) puede tener localidades distintas — deben depender siempre del archivo de venta importado.
- Se confirma que el rol **Staff** solo debe visualizar y operar sobre su propio punto de trabajo, nunca sobre boletos de otros puntos.
- Se confirma que el **canje masivo** es una necesidad real y frecuente por las compras corporativas/grupales, por lo que se prioriza para el desarrollo.
- Se confirma que toda operación (canje, impresión, reimpresión) debe quedar en auditoría sin excepción, por ser un punto sensible de control interno.

## 6. Acuerdos y siguientes pasos

1. El backlog de requerimientos queda **aprobado** para pasar a la etapa de diseño de arquitectura y base de datos (Semana 2).
2. No se identifican requerimientos adicionales pendientes en esta etapa.
3. Cualquier requerimiento nuevo que surja durante el desarrollo deberá documentarse y validarse nuevamente con el tutor empresarial.

---

**Firma Pasante:** ______________________
**Firma Tutor Empresarial:** ______________________

**Observaciones generales:** Sin observaciones.
