# Levantamiento de Información y Flujo Operativo de Eventos

**Actividad N°:** 3
**Fecha:** 03/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Recolectar la información operativa detallada de cómo se organiza un evento el día del canje: puntos de trabajo, localidades, datos disponibles y secuencia real de atención al asistente.

## 2. Técnicas de levantamiento utilizadas

- Entrevista con el tutor empresarial (Miguel Vivanco) sobre la operación de eventos anteriores.
- Revisión directa del archivo real de datos de venta (`LUMINEERS.csv`).
- Análisis de la estructura de columnas y volumen de registros del archivo.

## 3. Datos recolectados del archivo fuente

Se identificó que cada evento se gestiona a partir de un archivo CSV exportado de la plataforma de venta, con las siguientes columnas relevantes:

- First Name, Last Name, Email
- Ticket, Seat (define la **localidad** del asistente, ej. BLACK BOX, PLATINUM, GENERAL)
- Transaction ID (agrupa boletos de una misma compra)
- Ticket ID (identificador único de cada boleto individual)
- Número de Cédula

**Hallazgo clave:** las localidades **no son fijas**, dependen de cada evento (cambian de un concierto a otro), por lo que deben poder extraerse dinámicamente del archivo en lugar de estar programadas de forma fija en el sistema.

## 4. Puntos de trabajo / puntos de venta

Se definió que la operación se organiza por **puntos de venta** (por ejemplo, "LUMINEERS - General"), y cada punto de venta agrupa una o varias localidades. El personal de staff se asigna a un punto de trabajo específico y solo debe ver/atender los boletos correspondientes a ese punto.

## 5. Flujo operativo del día del evento (detallado)

```
1. Apertura del punto de canje
   └─ Staff inicia sesión en el sistema con su usuario y punto de trabajo asignado

2. Llegada del asistente al punto de canje
   └─ Presenta su cédula y/o datos de compra (nombre, transacción, ticket)

3. Búsqueda del boleto
   └─ Staff busca por nombre, cédula, email o número de ticket

4. Validación de identidad
   └─ Staff confirma que los datos coinciden con la persona presente

5. Registro de quién retira
   └─ Titular / Titular de la compra / Otra persona (con parentesco y celular)

6. Confirmación del canje
   └─ El boleto queda marcado como canjeado, con fecha, hora, usuario y punto de trabajo

7. Entrega física de la entrada al asistente

8. Registro automático en auditoría
   └─ Queda trazabilidad permanente de la operación
```

## 6. Casos especiales identificados

- **Compras grupales/corporativas**: una sola Transaction ID puede agrupar múltiples Ticket ID (varias localidades o varias entradas para la misma empresa/familia).
- **Retiro por terceros**: frecuente en compras corporativas, donde una sola persona retira múltiples entradas a nombre de otros.
- **Reimpresión**: un boleto ya canjeado puede requerir reimpresión (ej. entrada dañada), pero solo debe permitirse a roles autorizados y dejando registrado el motivo.

## 7. Conclusiones del día

Se cuenta con la información operativa suficiente (estructura de datos, roles, puntos de trabajo y flujo de atención) para pasar a la identificación formal de requerimientos funcionales y no funcionales del sistema.

**Observaciones:** Sin observaciones.
