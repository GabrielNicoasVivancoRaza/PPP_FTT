# Configuración Final y Publicación del Sistema

**Actividad N°:** 37
**Fecha:** 21/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Dejar documentado el procedimiento formal de publicación del sistema en Render, como guía a ejecutar por quien tenga acceso administrativo a la cuenta de Render y de MongoDB Atlas de la empresa.

## 2. Alcance de esta actividad

La publicación real requiere acceso a paneles externos (Render, MongoDB Atlas) que pertenecen a la cuenta de la empresa y no son accesibles desde este entorno de desarrollo. Por esta razón, el resultado de este día es el **procedimiento verificado y documentado**, listo para ser ejecutado por el tutor empresarial o quien administre esas cuentas, en vez de una publicación ejecutada directamente desde aquí.

## 3. Procedimiento de publicación (Backend)

1. Rotar la contraseña de MongoDB Atlas (pendiente crítico del Día 36) y obtener la nueva cadena de conexión.
2. En el dashboard de Render, crear/actualizar el servicio web `backend` con `rootDir: backend`.
3. Configurar variables de entorno manualmente: `MONGODB_URI` (nueva, rotada), `DEFAULT_PASSWORD`, `CORS_ORIGIN` (dominio real del frontend), `NODE_ENV=production`. `JWT_SECRET` se genera automáticamente.
4. Build command: `npm install`. Start command: `npm start`.
5. Desplegar y verificar `GET /health` y `GET /api/health` contra la URL pública del backend.

## 4. Procedimiento de publicación (Frontend)

1. Configurar `VITE_API_URL` apuntando a la URL pública real del backend ya desplegado.
2. Build command: `npm install && npm run build`. Publish path: `dist`.
3. Verificar las reglas de *rewrite*: `/api/*` hacia el backend, `/*` hacia `index.html` (necesario para que las rutas de React Router funcionen al recargar la página, ej. `/tickets`).
4. Desplegar y verificar que la pantalla de Login carga correctamente sobre la URL pública.

## 5. Verificación posterior a la publicación (a ejecutar por quien despliegue)

| Verificación | Cómo comprobarla |
|---|---|
| Backend responde | `curl https://<backend-url>/health` |
| Frontend carga | Abrir la URL pública del frontend en el navegador |
| Login funciona | Iniciar sesión con el usuario `sistema` creado por `setup.js` |
| CORS correctamente configurado | El frontend logra llamar a la API sin errores de CORS en consola del navegador |
| WebSocket conecta | Verificar en la consola del navegador que Socket.IO conecta (`✅ Socket.IO conectado`) |
| Datos del evento cargados | Ejecutar `node src/scripts/setup.js` contra la base de datos de producción **antes** de habilitar el acceso público, si aún no se ha hecho |

## 6. Nota importante sobre el orden de arranque

Como quedó documentado en la Semana 6 (hallazgo del administrador duplicado), es importante que `setup.js` se ejecute como parte del proceso de publicación (para crear el usuario `sistema`/`sistema-inicial` y el Punto de Venta con las localidades del evento) **antes** de anunciar el sistema como disponible al personal de la empresa.

## 7. Conclusiones del día

Queda documentado el procedimiento completo de publicación en Render para backend y frontend, incluyendo las verificaciones posteriores necesarias, dejando claro que la ejecución real de estos pasos corresponde a quien tenga acceso administrativo a las cuentas de la empresa en Render y MongoDB Atlas.

**Observaciones:** Procedimiento documentado y listo para ejecución; la publicación real depende de acceso administrativo externo a este entorno.
