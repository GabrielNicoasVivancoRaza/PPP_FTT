# Corrección de Incidencias Detectadas

**Actividad N°:** 33
**Fecha:** 15/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Cerrar formalmente el registro de incidencias detectadas durante todo el ciclo de desarrollo (Semanas 3 a 7), verificando que todas estén corregidas antes de pasar a la validación con usuarios de la empresa, y corregir la incidencia menor registrada el día anterior.

## 2. Registro consolidado de incidencias del proyecto

| # | Incidencia | Detectada en | Severidad | Estado |
|---|---|---|---|---|
| 1 | `bulk-canje` autorizaba tanto a Jefe como a Staff a nivel de API, contradiciendo el diseño de interfaz (solo Jefe) | Revisión de diseño, Semana 3 (Día 15) | Media (control de acceso) | ✅ Corregida en Semana 4 (Día 19) |
| 2 | Fallback hardcodeado de localidades de un evento anterior en `getTicketsForStaff`, activable si el punto de trabajo no coincidía con ningún Punto de Venta real | Desarrollo, Semana 5 (Día 21) | Alta (datos incorrectos silenciosos) | ✅ Corregida en Semana 5 (Día 21) |
| 3 | Condición de búsqueda muerta `'Número de Cédula: '` en 3 controladores, nunca coincidía con el schema real | Desarrollo, Semana 5 (Día 22) | Baja (deuda técnica, sin impacto funcional) | ✅ Corregida en Semana 5 (Día 22) |
| 4 | Doble mecanismo de creación de usuario administrador (`database.js` creaba `admin@shakira.com` automáticamente, compitiendo con `setup.js`) | Validación administrativa, Semana 6 (Día 30) | Alta (credenciales documentadas podían no funcionar) | ✅ Corregida en Semana 6 (Día 30) |
| 5 | Nombre de servicio `'shakira-tickets'` en metadatos del logger (Winston), remanente del proyecto anterior | Pruebas funcionales, Semana 7 (Día 32) | Muy baja (cosmética, solo visible en logs internos) | ✅ Corregida hoy (Día 33) |

## 3. Corrección aplicada hoy: nombre de servicio en el logger

**Archivo modificado:** `backend/src/config/logger.js`

```diff
- defaultMeta: { service: 'shakira-tickets' },
+ defaultMeta: { service: 'canje-ftt' },
```

Este cambio no afecta el comportamiento del sistema; únicamente corrige la etiqueta `service` que Winston adjunta a cada entrada de `logs/combined.log` y `logs/error.log`, alineándola con la identidad real del proyecto (Canje FTT / FeelTheTickets) en vez de la referencia heredada al proyecto anterior ("Shakira").

## 4. Verificación de cierre de todas las incidencias

Se realizó una revisión cruzada de los 5 archivos modificados durante todo el proyecto para confirmar que ninguna corrección quedó a medias:

| Archivo | Cambios acumulados | Verificado |
|---|---|---|
| `backend/src/routes/tickets.js` | `authorize('jefe')` en `bulk-canje` | ✅ |
| `backend/src/controllers/puntoVentaController.js` | Fallback eliminado + limpieza de campo cédula (2 ocurrencias) | ✅ |
| `backend/src/controllers/ticketController.js` | Limpieza de campo cédula (1 ocurrencia) | ✅ |
| `backend/src/config/database.js` | Eliminación de `createDefaultAdmin()` y su importación de `User` | ✅ |
| `backend/src/config/logger.js` | Nombre de servicio corregido | ✅ |

## 5. Incidencias abiertas pendientes (fuera de este ciclo)

- **Credenciales en `render.yaml`:** se detectó desde la Semana 2 que este archivo de despliegue contiene una URI de MongoDB con usuario y contraseña en texto plano, del proyecto anterior ("Shakira"). No se ha corregido dentro de este ciclo porque afecta la configuración de despliegue en Render (fuera del alcance de una corrección de código local) y requiere coordinación directa con el tutor empresarial para rotar credenciales y mover el valor a variables de entorno gestionadas desde el panel de Render. **Se recomienda tratarla antes del despliegue de la Semana 8.**

## 6. Conclusiones del día

Todas las incidencias funcionales y de seguridad detectadas durante el desarrollo (5 en total) quedan corregidas y verificadas, dejando únicamente pendiente la rotación de credenciales del archivo de despliegue, que se abordará explícitamente antes de la publicación del sistema en la Semana 8.

**Observaciones:** Pendiente para la Semana 8: rotar credenciales expuestas en `render.yaml` antes del despliegue.
