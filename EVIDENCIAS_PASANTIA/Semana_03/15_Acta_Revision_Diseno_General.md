# Acta de Revisión del Diseño General

**Actividad N°:** 15
**Fecha:** 19/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo de la reunión

Revisar de forma integral el diseño producido durante la semana (arquitectura, base de datos, módulos e interfaces) antes de iniciar el desarrollo, verificando consistencia entre las decisiones de diseño y detectando posibles ajustes pendientes.

## 2. Participantes

| Nombre | Rol |
|---|---|
| Miguel Vivanco | Tutor Empresarial (FeelTheTickets) |
| Gabriel | Pasante / Desarrollador |

## 3. Documentos presentados

- `11_Diseno_Arquitectura_Sistema.md`
- `12_Diseno_Base_Datos_MongoDB.md`
- `13_Diseno_Modulos_Componentes.md`
- `14_Diseno_Interfaces_Navegacion.md`

## 4. Puntos revisados y resultado

| Punto revisado | Resultado |
|---|---|
| Arquitectura de 3 capas + Socket.IO por salas | ✅ Aprobada |
| Modelo de datos (4 colecciones, índices, relaciones) | ✅ Aprobado |
| Organización modular backend/frontend | ✅ Aprobada |
| Matriz de trazabilidad módulo → requerimiento | ✅ Aprobada, sin brechas de cobertura |
| Mapa de navegación y protección de rutas en 2 niveles | ✅ Aprobado |

## 5. Hallazgo detectado durante la revisión

Al revisar en conjunto el diseño de interfaces (menú visible solo para Jefe) contra el diseño de rutas del backend, se detectó una **inconsistencia de permisos** en el canje masivo:

- El **frontend** (menú y checkboxes de selección múltiple) solo lo muestra al rol **Jefe**.
- El **backend** (`POST /api/tickets/bulk-canje`) actualmente autoriza tanto a **Jefe como a Staff** a nivel de API.

**Decisión del tutor empresarial:** se mantiene la restricción de negocio de que el canje masivo es una operación de supervisión y debe quedar exclusivamente para el rol Jefe. Se registra como **acción pendiente para la etapa de desarrollo/control de acceso (Semana 4)**: ajustar el backend para que `authorize('jefe')` sea el único rol permitido en la ruta `bulk-canje`, alineando el backend con el diseño de interfaz ya aprobado.

## 6. Acuerdos y siguientes pasos

1. Se aprueba el diseño general del sistema (arquitectura, base de datos, módulos e interfaces).
2. Se registra como pendiente técnico la corrección de permisos de `bulk-canje` para la Semana 4 (módulo de autenticación, usuarios y control de acceso).
3. Se autoriza iniciar la Semana 4: desarrollo de los módulos de autenticación, gestión de usuarios y control de acceso al sistema.

---

**Firma Pasante:** ______________________
**Firma Tutor Empresarial:** ______________________

**Observaciones generales:** Se detectó y documentó una inconsistencia de permisos entre frontend y backend en el canje masivo, quedando como pendiente de ajuste en la siguiente etapa.
