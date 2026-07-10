# Identificación de Requerimientos y Necesidades del Sistema

**Actividad N°:** 4
**Fecha:** 04/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Traducir los hallazgos de los días anteriores (proceso AS-IS, flujo operativo, problemas y casos especiales) en un conjunto formal de requerimientos funcionales, no funcionales e historias de usuario que guiarán el desarrollo del sistema.

## 2. Requerimientos Funcionales (RF)

| ID | Requerimiento |
|---|---|
| RF-01 | El sistema debe permitir el inicio de sesión mediante usuario y contraseña, con roles diferenciados (Jefe, Staff) |
| RF-02 | El sistema debe permitir buscar boletos por nombre, apellido, email, cédula, Ticket ID o Transaction ID |
| RF-03 | El sistema debe permitir filtrar boletos por localidad (Seat) y por punto de trabajo |
| RF-04 | El sistema debe permitir canjear un boleto individual, registrando quién retira (Titular / Titular de la compra / Otro), parentesco (si aplica) y celular |
| RF-05 | El sistema debe impedir canjear un boleto que ya fue canjeado previamente |
| RF-06 | El sistema debe permitir a un usuario Jefe realizar **canje masivo** de varios boletos seleccionados con un mismo formulario de datos de retiro |
| RF-07 | El sistema debe permitir reimpresión de un boleto ya canjeado, solo a usuarios Jefe, registrando un motivo obligatorio |
| RF-08 | El sistema debe registrar en auditoría cada canje, impresión y reimpresión: usuario responsable, fecha/hora, punto de trabajo y detalles de la operación |
| RF-09 | El sistema debe permitir la gestión de usuarios (crear, editar, eliminar) solo para el rol Jefe |
| RF-10 | El sistema debe permitir la gestión de puntos de venta y sus localidades asociadas (extraídas del archivo de origen) |
| RF-11 | El sistema debe presentar un dashboard con estadísticas de canje (total de boletos, canjeados, pendientes, evolución diaria, distribución por punto de trabajo) para el rol Jefe |
| RF-12 | El sistema debe permitir importar los datos de venta desde un archivo CSV, extrayendo automáticamente las localidades disponibles |
| RF-13 | El sistema debe notificar en tiempo real a los demás usuarios conectados cuando un boleto es canjeado o impreso, sin necesidad de recargar la página |

## 3. Requerimientos No Funcionales (RNF)

| ID | Requerimiento |
|---|---|
| RNF-01 | Seguridad: autenticación basada en JWT con expiración de sesión |
| RNF-02 | Seguridad: contraseñas almacenadas con hash (bcrypt), nunca en texto plano |
| RNF-03 | Control de acceso basado en roles para cada endpoint del backend |
| RNF-04 | Disponibilidad: el sistema debe soportar al menos 10 usuarios concurrentes sin degradación perceptible |
| RNF-05 | Rendimiento: las búsquedas de boletos deben responder en tiempo aceptable incluso con miles de registros (uso de índices en base de datos) |
| RNF-06 | Trazabilidad: ninguna acción de canje/reimpresión debe poder perderse; debe quedar registrada en un log de auditoría inmutable |
| RNF-07 | Usabilidad: la interfaz debe permitir operar con eficiencia bajo presión de tiempo (fila de personas esperando) |
| RNF-08 | El sistema debe funcionar correctamente en un entorno de despliegue en la nube (backend y frontend desplegables de forma independiente) |

## 4. Historias de Usuario

### HU-01 — Inicio de sesión seguro
**Como** usuario del sistema (Jefe o Staff)
**Quiero** iniciar sesión con mi usuario y contraseña
**Para** acceder únicamente a las funciones que corresponden a mi rol

**Criterios de aceptación:**
- Si las credenciales son inválidas, el sistema muestra un mensaje de error sin revelar cuál dato falló.
- El acceso a rutas protegidas depende del rol del usuario autenticado.

### HU-02 — Búsqueda de boletos
**Como** Staff
**Quiero** buscar un boleto por nombre, cédula, email o número de ticket
**Para** ubicar rápidamente al asistente que se presenta en el punto de canje

**Criterios de aceptación:**
- La búsqueda debe devolver resultados aunque solo se ingrese un dato parcial (nombre o parte de la cédula).
- Los resultados se limitan a los boletos del punto de trabajo asignado (si el usuario es Staff).

### HU-03 — Canje individual de boleto
**Como** Staff
**Quiero** registrar el canje de un boleto indicando quién lo retira y su celular
**Para** dejar constancia de la entrega y evitar canjes duplicados

**Criterios de aceptación:**
- Si el boleto ya fue canjeado, el sistema debe rechazar un nuevo canje con un mensaje claro.
- Si "quién retira" es "Otro", el sistema exige parentesco y nombre de quien retira.

### HU-04 — Canje masivo de boletos
**Como** Jefe
**Quiero** seleccionar varios boletos y canjearlos con un mismo formulario de datos de retiro
**Para** atender rápidamente compras grupales o corporativas

**Criterios de aceptación:**
- Puedo seleccionar boletos individualmente o todos los pendientes con un solo clic.
- Los boletos ya canjeados no pueden seleccionarse.
- El sistema informa cuántos boletos se canjearon y cuántos ya estaban canjeados previamente.

### HU-05 — Reimpresión controlada
**Como** Jefe
**Quiero** reimprimir un boleto ya canjeado indicando un motivo
**Para** atender casos excepcionales (entrada dañada o perdida) sin perder el control del proceso

**Criterios de aceptación:**
- Un usuario Staff no puede reimprimir boletos.
- Toda reimpresión queda registrada con fecha, motivo y usuario responsable.

### HU-06 — Auditoría de operaciones
**Como** Jefe
**Quiero** consultar un historial de auditoría de todas las operaciones realizadas
**Para** poder investigar incidencias y garantizar trazabilidad completa

**Criterios de aceptación:**
- Cada registro de auditoría muestra usuario, acción, fecha/hora y punto de trabajo.
- El historial es de solo lectura para el rol Jefe (no editable).

### HU-07 — Dashboard de estadísticas
**Como** Jefe
**Quiero** ver un panel con el total de boletos, canjeados, pendientes y su evolución diaria
**Para** monitorear el avance del canje durante el evento

**Criterios de aceptación:**
- Las estadísticas se pueden filtrar por punto de trabajo.
- Los datos se actualizan reflejando canjes recientes.

### HU-08 — Gestión de puntos de venta y localidades
**Como** Jefe
**Quiero** administrar los puntos de venta y ver las localidades disponibles extraídas del archivo de venta
**Para** organizar la operación sin depender de cambios manuales en el código para cada evento

**Criterios de aceptación:**
- Las localidades se generan automáticamente al importar el archivo CSV del evento.
- Puedo asociar una o más localidades a un punto de venta.

### HU-09 — Actualización en tiempo real
**Como** usuario (Jefe o Staff) trabajando junto a otros compañeros
**Quiero** ver reflejado al instante cuando otro usuario canjea un boleto
**Para** evitar canjes duplicados por falta de sincronización entre puntos de trabajo

**Criterios de aceptación:**
- El cambio se refleja sin recargar la página.
- La actualización no interrumpe al usuario si está escribiendo en un campo de búsqueda.

## 5. Conclusiones del día

Se cuenta con un backlog inicial de requerimientos funcionales, no funcionales e historias de usuario, listo para ser presentado al tutor empresarial el día siguiente para su validación formal.

