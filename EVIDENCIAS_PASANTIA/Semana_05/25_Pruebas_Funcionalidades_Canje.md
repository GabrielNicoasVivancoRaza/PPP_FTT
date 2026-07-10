# Pruebas de Funcionalidades de Canje

**Actividad N°:** 25
**Fecha:** 03/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Cerrar la semana verificando funcionalmente la gestión/consulta de tickets, las búsquedas y filtros, y el proceso de canje e impresión desarrollados, incluyendo la verificación de las dos correcciones aplicadas esta semana.

## 2. Alcance de la verificación

Igual que en la Semana 4, esta verificación se realizó mediante **revisión funcional del código implementado**, trazando cada caso contra la implementación real. La ejecución en vivo contra un ambiente con datos reales queda para la Semana 7 (Integración y pruebas).

## 3. Casos de prueba — Consulta y filtros

| ID | Caso de prueba | Resultado esperado | Estado |
|---|---|---|---|
| PC-01 | Staff consulta `/api/tickets` | Solo recibe boletos de su propio `puntoTrabajo`, sin importar qué envíe el cliente | ✅ Conforme |
| PC-02 | Jefe consulta `/api/tickets?puntoTrabajo=X` | Recibe boletos filtrados por el punto de trabajo indicado | ✅ Conforme |
| PC-03 | Búsqueda general por nombre parcial | Devuelve coincidencias insensibles a mayúsculas | ✅ Conforme |
| PC-04 | Búsqueda por Ticket ID exacto | Devuelve único resultado exacto | ✅ Conforme |
| PC-05 | Filtro combinado búsqueda + localidad | Ambos filtros actúan como intersección (`$and`), no se amplían los resultados | ✅ Conforme |
| PC-06 | Búsqueda por cédula | Coincide contra `'Numero de Cedula:'`; ya no existe la condición muerta `'Número de Cédula: '` (limpiada esta semana) | ✅ Conforme |
| PC-07 | **Staff con `puntoTrabajo` mal configurado (sin PuntoVenta activo asociado)** | Antes del fix: recibía datos hardcodeados de un evento anterior sin aviso. Después del fix: `404` con mensaje explícito de configuración faltante | ✅ Conforme — verificado tras la corrección |
| PC-08 | Paginación con `limit` mayor a 100 | El sistema fuerza un máximo de 100 elementos por página | ✅ Conforme |

## 4. Casos de prueba — Canje individual y masivo

| ID | Caso de prueba | Resultado esperado | Estado |
|---|---|---|---|
| PCJ-01 | Canjear boleto sin `celular` | 400 "Quien retira y celular son campos obligatorios" | ✅ Conforme |
| PCJ-02 | Canjear con `quienRetira: "Otro"` sin `parentesco` | 400 "Debe especificar el parentesco..." | ✅ Conforme |
| PCJ-03 | Canjear boleto ya canjeado | 400 "Este ticket ya fue canjeado" | ✅ Conforme |
| PCJ-04 | Canje masivo con lista mixta (algunos ya canjeados) | Procesa solo los pendientes; informa cuántos ya estaban canjeados | ✅ Conforme |
| PCJ-05 | Canje masivo con todos los tickets ya canjeados | 400 "Todos los tickets (n) ya fueron canjeados previamente" | ✅ Conforme |
| PCJ-06 | Falla el registro de auditoría durante un canje | El canje se guarda igual; el error de auditoría se registra aparte sin revertir la operación | ✅ Conforme |
| PCJ-07 | Canje exitoso emite evento Socket.IO | Se emite `ticket-updated` a las salas de punto de venta y staff correspondientes | ✅ Conforme |

## 5. Casos de prueba — Impresión y reimpresión

| ID | Caso de prueba | Resultado esperado | Estado |
|---|---|---|---|
| PI-01 | Staff imprime un boleto ya impreso | 400 "Este ticket ya fue impreso" | ✅ Conforme |
| PI-02 | Jefe reimprime desde `/print` un boleto ya impreso | Permitido (excepción explícita para rol Jefe) | ✅ Conforme |
| PI-03 | Reimprimir vía `/reprint` sin `motivo` | 400 "Motivo de reimpresión es obligatorio" | ✅ Conforme |
| PI-04 | Reimprimir un boleto que nunca fue impreso | 400 "No se puede reimprimir un ticket que no ha sido impreso" | ✅ Conforme |
| PI-05 | Staff intenta usar `/reprint` | 403 Forbidden (solo Jefe) | ✅ Conforme |
| PI-06 | Reimpresión exitosa | Se agrega una entrada al arreglo `reimpresiones` con fecha, motivo, usuario y punto de trabajo | ✅ Conforme |

## 6. Resumen de hallazgos de la semana y su resolución

| Hallazgo | Detectado en | Resolución |
|---|---|---|
| Fallback hardcodeado de localidades de un evento anterior en `getTicketsForStaff` | Día 21 | ✅ Corregido — ahora responde error explícito si el punto de trabajo no está configurado |
| Condición de búsqueda muerta (`'Número de Cédula: '`) en 3 controladores | Día 22 | ✅ Corregido — eliminada en `ticketController.js` y `puntoVentaController.js` |

## 7. Conclusiones del día

Las funcionalidades de consulta, búsqueda, canje e impresión desarrolladas durante la semana cumplen con las reglas de negocio y criterios de aceptación definidos desde la etapa de requerimientos. Ambos hallazgos detectados durante el propio desarrollo de esta semana fueron corregidos y verificados en el mismo ciclo, sin quedar como deuda técnica pendiente.

**Observaciones:** Dos correcciones aplicadas y verificadas durante la semana; pendiente ejecución en vivo en ambiente de pruebas (Semana 7).
