# Análisis del Proceso de Venta y Canje de Entradas (AS-IS)

**Actividad N°:** 2
**Fecha:** 02/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Analizar cómo funciona hoy (antes/sin el sistema, o con soporte parcial) el proceso de venta y canje de entradas, para identificar puntos críticos, riesgos y oportunidades de mejora que el sistema debe resolver.

## 2. Actores del proceso

| Actor | Participación |
|---|---|
| Comprador / Asistente | Compra la entrada en línea y luego se presenta a canjearla en el evento |
| Plataforma de venta | Genera los datos de la compra (Nombre, Email, Ticket, Localidad/Seat, Transaction ID, Ticket ID, Cédula) |
| Staff en punto de canje | Recibe al asistente, valida su identidad y realiza el canje/entrega |
| Jefe / Administrador | Supervisa el proceso, resuelve incidencias (reimpresiones, canjes masivos, duplicados) |

## 3. Insumo de datos: exportación de venta

La plataforma de venta entrega un archivo **CSV** con un registro por boleto vendido. Ejemplo de estructura real (`LUMINEERS.csv`):

| Campo | Ejemplo |
|---|---|
| First Name | Anahi |
| Last Name | Flor |
| Email | anahifz29@gmail.com |
| Ticket | BLACK BOX |
| Seat (Localidad) | BLACK BOX |
| Transaction ID | 8963169 |
| Ticket ID (único) | 17237508 |
| Número de Cédula | 1719518019 |

Este archivo es la única fuente de verdad de qué boletos existen y a quién pertenecen antes del canje.

## 4. Flujo actual del proceso (AS-IS)

```
1. Asistente compra su entrada en línea (fuera del sistema de canje)
        │
2. La plataforma de venta genera un registro con sus datos (fila del CSV)
        │
3. El día del evento, el asistente se acerca a un punto de canje físico
        │
4. El staff debe ubicar manualmente el registro del comprador
   (por nombre, cédula o número de ticket)
        │
5. El staff valida la identidad de quien retira
        │
6. Se hace entrega física de la entrada/pulsera
        │
7. (Riesgo) Sin sistema, no queda registro digital de quién retiró,
   cuándo, ni en qué punto — dificulta el control y la auditoría
```

## 5. Problemas y riesgos identificados

- **Búsqueda manual lenta**: sin un sistema, ubicar un registro entre miles de compradores (el CSV real supera varios miles de filas) es lento y propenso a error humano.
- **Riesgo de doble canje**: sin marcar el boleto como "canjeado", la misma entrada podría entregarse dos veces.
- **Falta de trazabilidad**: no queda registro de qué usuario del staff entregó cada entrada, ni cuándo, ni en qué punto de venta.
- **Terceros retirando entradas**: es común que alguien distinto al comprador retire la entrada (familiar, mensajero de empresa) y no hay forma estandarizada de registrar ese dato.
- **Escenarios de grupos/empresas**: compras corporativas de múltiples entradas requieren canjear muchos boletos a la vez con los mismos datos de retiro, lo cual es lento de forma manual/una por una.
- **Reimpresión no controlada**: si una entrada se daña o se pierde, no hay un motivo ni historial registrado de reimpresión.

## 6. Oportunidades de mejora identificadas (input para requerimientos)

- Digitalizar la búsqueda del boleto (por nombre, cédula, email o ticket ID).
- Marcar automáticamente el boleto como canjeado y bloquear un segundo canje.
- Registrar quién retira (titular, titular de la compra u otra persona) y su parentesco/celular.
- Permitir canje masivo para grupos con los mismos datos de retiro.
- Registrar auditoría completa: usuario responsable, punto de trabajo, fecha/hora.
- Habilitar reimpresión controlada, solo para roles autorizados, con motivo obligatorio.
- Permitir que varios puntos de venta trabajen en paralelo sin pisarse los datos.

## 7. Conclusiones del día

El proceso actual de canje depende completamente de la validación manual del staff, sin registro digital ni control de duplicados. Estos hallazgos son el insumo directo para el levantamiento de información del día siguiente y para la definición de requerimientos.

