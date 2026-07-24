# Corrección de Defectos en Producción (Render) — Login

**Actividad N°:** 44
**Fecha:** 28/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 0. Nota de contexto

Tras el despliegue en Render (Días 36-37), se reportó un problema real detectado en el ambiente de producción: el login fallaba con "Credenciales inválidas" incluso usando el correo y contraseña correctos, y en algunos intentos la pantalla se quedaba cargando y luego se ponía completamente en blanco, sin llegar a mostrar ningún mensaje de error. Este documento registra el diagnóstico y la corrección de dos defectos reales encontrados en el flujo de autenticación, ambos activos únicamente en el ambiente desplegado (no se habían manifestado en pruebas locales previas).

## 1. Defecto corregido: pantalla en blanco al fallar el login

**Síntoma reportado:** al enviar el formulario de login con datos incorrectos, la página se quedaba cargando unos segundos y luego se veía en blanco, como si se hubiera recargado. El mensaje "Credenciales inválidas" nunca llegaba a mostrarse.

**Causa real:** el interceptor de respuestas de Axios en `frontend/src/services/api.js` trataba **cualquier** respuesta HTTP 401 como "sesión expirada": limpiaba `localStorage` y forzaba `window.location.href = '/login'` (recarga completa del navegador). Esta lógica no distinguía entre un 401 por token expirado en una ruta protegida (caso para el que fue diseñada) y el 401 que el propio endpoint `POST /auth/login` devuelve cuando la contraseña es incorrecta. En ese segundo caso, la recarga forzada de página ocurría antes de que el componente `Login.jsx` pudiera ejecutar su `catch` y renderizar el mensaje de error, resultando en el "parpadeo en blanco" reportado.

**Corrección:** se agregó una excepción explícita en el interceptor (`frontend/src/services/api.js`) para que la limpieza de sesión y la redirección forzada **no** se disparen cuando el 401 proviene de `/auth/login`, dejando que el propio formulario maneje y muestre ese error normalmente.

## 2. Defecto corregido: login rechazado por sensibilidad a mayúsculas

**Síntoma reportado:** el mismo error de "Credenciales inválidas" persistía en algunos intentos aun con contraseña verificada como correcta.

**Causa real:** el modelo `User` (`backend/src/models/User.js`) define el campo `usuario` con `lowercase: true`, por lo que todo usuario se guarda siempre en minúsculas. Sin embargo, `authController.js` buscaba el usuario con `User.findOne({ usuario })`, usando el valor **tal cual** llegaba del formulario, sin normalizar a minúsculas. Si el correo se escribía (o el navegador lo autocompletaba) con alguna letra mayúscula, la búsqueda no encontraba ningún documento y el controlador respondía "Credenciales inválidas" — el mismo mensaje que se usa para contraseña incorrecta, lo que hacía indistinguible este caso del de un password realmente equivocado.

**Corrección:** en `backend/src/controllers/authController.js`, la búsqueda ahora normaliza el valor recibido con `.trim().toLowerCase()` antes de consultar la base de datos, replicando la misma normalización que el schema aplica al guardar.

## 3. Alcance no cubierto en esta sesión

- No se pudo verificar en vivo contra el ambiente real de Render en este momento (sin acceso directo a la sesión del navegador donde se reportó el problema); la corrección se basó en lectura de código y reproducción del flujo lógico de ambos defectos.
- Queda pendiente confirmar con el tutor si `MONGODB_URI` está correctamente configurada en el dashboard de Render del servicio `shakira-backend` (variable con `sync: false` en `render.yaml`, no versionada), ya que un valor ausente o incorrecto generaría un error 500 distinto al reportado, pero conviene descartarlo como causa concurrente.
- No se agregó una prueba automatizada de regresión para el caso de mayúsculas en el login; se recomienda incorporarla en una futura iteración de la suite de pruebas (Día 41).

## 4. Conclusiones del día

Se diagnosticaron y corrigieron dos defectos reales del flujo de login en producción: (1) un interceptor de Axios que enmascaraba el mensaje de error real del login al forzar una recarga de página ante cualquier 401, y (2) una búsqueda de usuario sin normalizar mayúsculas/minúsculas que producía falsos negativos de autenticación. Ambas correcciones son mínimas y localizadas (un archivo de frontend, un archivo de backend) y no alteran el contrato de la API ni el comportamiento esperado del resto del sistema.

**Observaciones:** defectos detectados directamente en el ambiente de Render (post-despliegue), no reproducidos previamente en ambiente local; corrección pendiente de verificación en vivo por el tutor tras el redeploy.
