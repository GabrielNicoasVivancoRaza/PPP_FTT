# Análisis de Requerimientos Funcionales

**Actividad N°:** 6
**Fecha:** 08/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Profundizar el backlog de requerimientos funcionales aprobado en la Semana 1, especificando reglas de negocio, entradas/salidas, prioridad y complejidad de cada uno, como insumo directo para el diseño técnico.

## 2. Especificación detallada de Requerimientos Funcionales

### RF-01 — Autenticación de usuarios
- **Entrada:** usuario, contraseña.
- **Salida:** token de sesión (JWT) + datos del usuario (nombre, rol, punto de trabajo).
- **Regla de negocio:** un usuario inactivo (`activo: false`) no puede iniciar sesión aunque la contraseña sea correcta.
- **Prioridad:** Alta | **Complejidad:** Baja

### RF-02 — Búsqueda de boletos
- **Entrada:** texto de búsqueda (nombre, apellido, email, cédula, Ticket ID o Transaction ID).
- **Salida:** listado paginado de boletos que coinciden.
- **Regla de negocio:** la búsqueda es insensible a mayúsculas/minúsculas; combina múltiples criterios con `$and`/`$or` según el caso.
- **Prioridad:** Alta | **Complejidad:** Media

### RF-03 — Filtro por localidad y punto de trabajo
- **Entrada:** localidad (Seat), punto de trabajo.
- **Salida:** boletos filtrados.
- **Regla de negocio:** si el usuario autenticado es Staff, el filtro por punto de trabajo se aplica automáticamente y no puede ser cambiado por el usuario (se ignora cualquier valor enviado desde el cliente).
- **Prioridad:** Alta | **Complejidad:** Baja

### RF-04 — Canje individual de boleto
- **Entrada:** Ticket ID, quién retira (Titular / Titular Compra / Otro), parentesco (si Otro), nombre de quien retira (si Otro), celular.
- **Salida:** boleto actualizado (`canjeado: true`), confirmación.
- **Reglas de negocio:**
  - `celular` es obligatorio siempre.
  - Si `quienRetira = "Otro"`, son obligatorios además `parentesco` y `quienOtro` (nombre).
  - Un boleto con `canjeado: true` no puede volver a canjearse (HTTP 400).
- **Prioridad:** Alta | **Complejidad:** Media

### RF-05 — Bloqueo de doble canje
- **Regla de negocio:** validación a nivel de backend (no solo interfaz) antes de guardar el cambio, para evitar condiciones de carrera entre puntos de trabajo simultáneos.
- **Prioridad:** Alta | **Complejidad:** Media

### RF-06 — Canje masivo
- **Entrada:** arreglo de Ticket IDs + un único formulario de datos de retiro.
- **Salida:** reporte de cuántos boletos se canjearon y cuántos ya estaban canjeados.
- **Regla de negocio:** los boletos ya canjeados dentro de la selección se excluyen automáticamente de la operación (no generan error, se informan aparte); la actualización se ejecuta como una sola operación `bulkWrite` para eficiencia.
- **Prioridad:** Media-Alta | **Complejidad:** Alta

### RF-07 — Reimpresión controlada
- **Entrada:** Ticket ID, motivo.
- **Salida:** boleto con nueva entrada en su historial de reimpresiones.
- **Reglas de negocio:**
  - Solo permitido si el boleto ya fue canjeado/impreso previamente.
  - Motivo es obligatorio.
  - Solo accesible para rol Jefe.
- **Prioridad:** Media | **Complejidad:** Baja

### RF-08 — Auditoría de operaciones
- **Entrada:** generada automáticamente por el sistema en cada operación relevante.
- **Salida:** registro de auditoría con tipo de operación, usuario, ticket, punto de trabajo, detalles e IP.
- **Regla de negocio:** un fallo al registrar auditoría **no debe** impedir que la operación principal (el canje) se complete; se registra el error de auditoría por separado.
- **Prioridad:** Alta | **Complejidad:** Baja

### RF-09 — Gestión de usuarios
- **Entrada:** nombre, usuario, contraseña, rol, punto de trabajo (obligatorio si el rol es Staff).
- **Regla de negocio:** solo un usuario Jefe puede crear/editar/eliminar usuarios; un usuario Staff siempre debe tener un punto de trabajo asignado.
- **Prioridad:** Media | **Complejidad:** Baja

### RF-10 — Gestión de puntos de venta y localidades
- **Entrada:** nombre del punto de venta, lista de localidades asociadas.
- **Regla de negocio:** las localidades disponibles para asociar provienen de los valores únicos de la columna "Seat" del CSV importado, no de una lista fija en el código.
- **Prioridad:** Alta | **Complejidad:** Media

### RF-11 — Dashboard de estadísticas
- **Salida:** total de boletos, canjeados, pendientes, porcentaje de avance, evolución diaria, distribución por punto de trabajo.
- **Regla de negocio:** solo visible para rol Jefe; permite filtrar por punto de trabajo y rango de fechas.
- **Prioridad:** Media | **Complejidad:** Media

### RF-12 — Importación desde CSV
- **Entrada:** archivo CSV con los datos de venta del evento.
- **Salida:** boletos cargados en la base de datos + punto de venta creado/actualizado con sus localidades.
- **Regla de negocio:** el `Ticket ID` es único; una re-importación no debe duplicar boletos existentes.
- **Prioridad:** Alta | **Complejidad:** Media

### RF-13 — Actualización en tiempo real
- **Entrada:** eventos de canje/impresión generados por cualquier usuario conectado.
- **Salida:** evento `ticket-updated` emitido a las salas correspondientes (por punto de venta o punto de trabajo).
- **Regla de negocio:** la actualización no debe interrumpir al usuario si está escribiendo en un campo de búsqueda o interactuando con un formulario (pausa inteligente).
- **Prioridad:** Media | **Complejidad:** Alta

## 3. Priorización consolidada

| Prioridad | Requerimientos |
|---|---|
| Alta | RF-01, RF-02, RF-03, RF-04, RF-05, RF-08, RF-10, RF-12 |
| Media-Alta | RF-06 |
| Media | RF-07, RF-09, RF-11, RF-13 |

## 4. Conclusiones del día

Cada requerimiento funcional cuenta ahora con reglas de negocio explícitas, lo cual permite pasar al análisis de requerimientos no funcionales y de seguridad sin ambigüedades sobre el comportamiento esperado del sistema.

**Observaciones:** Sin observaciones.
