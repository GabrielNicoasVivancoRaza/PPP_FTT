# Definición del Alcance del Sistema

**Actividad N°:** 8
**Fecha:** 10/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Delimitar formalmente qué incluye y qué NO incluye el sistema a desarrollar, evitando ambigüedades para las etapas de diseño y desarrollo.

## 2. Dentro del alcance (In Scope)

- Gestión y canje de boletos para **un evento a la vez** (caso real de referencia: concierto de Lumineers), con datos importados desde un archivo CSV entregado por la plataforma de venta.
- Búsqueda y filtrado de boletos por nombre, cédula, email, Ticket ID, Transaction ID y localidad (Seat).
- Canje individual y canje masivo de boletos, con registro de quién retira.
- Reimpresión controlada de boletos, restringida al rol Jefe.
- Gestión de usuarios internos del sistema (Jefe / Staff) y sus puntos de trabajo.
- Gestión de puntos de venta y localidades, extraídas dinámicamente del archivo importado.
- Auditoría completa de operaciones (canje, impresión, reimpresión, gestión de usuarios).
- Dashboard de estadísticas para el rol Jefe.
- Actualizaciones en tiempo real entre usuarios conectados (Socket.IO).
- Despliegue en la nube (backend y frontend) mediante Render.

## 3. Fuera del alcance (Out of Scope)

- **Venta de entradas en línea / pasarela de pagos**: el sistema no vende boletos ni procesa pagos; solo gestiona el canje de boletos ya vendidos por un canal externo.
- **Gestión de múltiples eventos/colecciones simultáneas**: en la versión actual (v2.0) el sistema trabaja sobre una única colección/evento activo a la vez; no se soporta operar varios eventos en paralelo desde la misma instancia.
- **Módulo de cronograma/Schedule**: existía en una versión anterior del proyecto y fue removido explícitamente del alcance por decisión de negocio (simplicidad operativa); no se reincorporará salvo nueva solicitud formal.
- **Aplicación móvil nativa**: el sistema se entrega como aplicación web responsiva, no como app nativa iOS/Android.
- **Facturación o control contable**: no se gestionan aspectos financieros/contables del evento, solo el control operativo del canje.
- **Integración directa con la plataforma de venta de entradas**: el ingreso de datos se realiza por importación de archivo CSV, no por integración API en tiempo real con el sistema de venta.

## 4. Supuestos

- El archivo CSV de venta se entrega completo y correcto antes del inicio del proceso de canje del evento.
- Cada boleto vendido tiene un `Ticket ID` único, que es la clave de identificación individual.
- La empresa dispone de conexión a internet estable en los puntos de canje el día del evento (requisito para tiempo real y autenticación contra el backend en la nube).

## 5. Restricciones

- Debe funcionar dentro de las capacidades del plan gratuito/estándar de MongoDB Atlas y Render usado por la empresa.
- El desarrollo debe mantenerse simple de operar para personal de staff sin conocimientos técnicos (usabilidad como restricción de diseño, no solo de UX).

## 6. Conclusiones del día

Con el alcance delimitado, quedan claros los límites del sistema frente a procesos que la empresa maneja por fuera (venta, pagos, facturación), lo que permite enfocar la planificación técnica exclusivamente en el proceso de canje.

**Observaciones:** Sin observaciones.
