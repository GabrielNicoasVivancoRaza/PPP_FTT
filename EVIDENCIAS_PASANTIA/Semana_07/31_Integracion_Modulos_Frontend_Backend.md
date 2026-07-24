# Integración de Módulos Frontend y Backend

**Actividad N°:** 31
**Fecha:** 13/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Verificar la integración real de todos los módulos desarrollados hasta ahora (autenticación, tickets, usuarios, puntos de venta, auditoría, tiempo real) levantando el sistema completo en un entorno local, en vez de continuar validando únicamente por inspección de código como en semanas anteriores.

## 2. Entorno de integración levantado

| Componente | Comando | Resultado |
|---|---|---|
| Backend | `node src/app.js` (puerto 5002) | Arranque exitoso |
| Frontend | `npx vite --port 5173` | Arranque exitoso, v4.5.14, listo en 1.87s |
| Base de datos | MongoDB Atlas (`MONGODB_URI` real de `.env`) | Conexión establecida |

## 3. Verificación de arranque del backend

Log real capturado al iniciar el servidor:

```
Servidor ejecutándose en puerto 5002
info: Servidor iniciado en puerto 5002
MongoDB Connected: ac-elsholl-shard-00-02.l08bhec.mongodb.net
Mongoose: Usuarios.createIndex({ usuario: 1 }, { unique: true, background: true })
Mongoose: FechaUno.createIndex({ 'Transaction ID': 1 }, { background: true })
Mongoose: PuntosVenta.createIndex({ nombre: 1 }, { unique: true, background: true })
... (índices restantes de Ticket, PuntosVenta y AuditLog)
```

Esto confirma que:
- La conexión a MongoDB Atlas con las credenciales reales del entorno de desarrollo es exitosa.
- Los índices definidos en los modelos (`Ticket`, `User`, `PuntoVenta`, `AuditLog`) se sincronizan correctamente al arrancar en modo desarrollo (`autoIndex: true`).
- No hay errores de arranque tras las correcciones aplicadas en las semanas 4, 5 y 6 (fix de `bulk-canje`, eliminación del fallback hardcodeado, limpieza de campo de cédula, eliminación del admin duplicado).

## 4. Verificación de endpoints de salud

```bash
curl http://localhost:5002/health
→ {"status":"OK","timestamp":"2026-07-13T...","uptime":15.21}

curl http://localhost:5002/api/health
→ {"status":"API_OK","timestamp":"2026-07-13T...","uptime":15.26,"cors":"No origin header"}
```

Ambos endpoints responden correctamente, confirmando que Express, el middleware de seguridad (Helmet, rate limiting, CORS) y el logging están correctamente inicializados sin bloquear las rutas públicas de salud.

## 5. Verificación de arranque del frontend

```bash
curl http://localhost:5173/
→ <!doctype html>... <title>FeelTheTickets — ...</title>
```

El servidor de desarrollo de Vite sirve correctamente el shell de la SPA con el título e inyecta el cliente de HMR (`@vite/client`, `@react-refresh`) esperado en modo desarrollo.

## 6. Decisión importante de seguridad de datos durante la integración

La base de datos configurada en `.env` es la **base de datos real de producción** del evento (Atlas cluster con datos reales de Lumineers), no una base de pruebas aislada. Por esa razón, durante esta sesión de integración se limitó deliberadamente la verificación a:

- Operaciones de solo lectura y de arranque (health checks, sincronización de índices).
- **No se ejecutaron** pruebas de login, canje o creación de usuarios contra esta base, para evitar generar registros de auditoría o modificaciones sobre datos reales del evento.

**Recomendación para el tutor empresarial:** para las pruebas funcionales de escritura (Día 32), se recomienda usar una base de datos de prueba (por ejemplo, un clúster/colección separada) o coordinar una ventana de pruebas controlada sobre la base real, con datos de prueba claramente identificables y un plan de limpieza posterior.

## 7. Conclusiones del día

La integración de frontend, backend y base de datos fue verificada en vivo por primera vez en el proyecto (no solo por inspección de código), confirmando que el sistema arranca correctamente con todas las correcciones acumuladas de semanas anteriores, y dejando una recomendación explícita sobre cómo proceder con seguridad en las pruebas funcionales de escritura del día siguiente.

**Observaciones:** Verificación en vivo exitosa; se recomienda entorno de datos de prueba para el Día 32.
