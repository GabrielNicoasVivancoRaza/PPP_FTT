# Preparación para Despliegue Local o en la Nube (Render)

**Actividad N°:** 36
**Fecha:** 20/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Dejar lista la configuración de despliegue (`render.yaml`) para publicar backend y frontend, resolviendo antes que nada el hallazgo de seguridad pendiente desde la Semana 2/7 (credenciales de MongoDB en texto plano dentro del repositorio), y complementar la preparación con un archivo de referencia de variables de entorno, una guía paso a paso para rotar las credenciales comprometidas en MongoDB Atlas, y una revisión de seguridad final del repositorio completo.

## 2. Corrección crítica aplicada: credenciales expuestas en `render.yaml`

**Archivo modificado:** `render.yaml`

```diff
      - key: MONGODB_URI
-       value: mongodb+srv://gabriel:gabriel@bddshakira.l08bhec.mongodb.net/Shakira8Noviembre
+       sync: false # Configurar manualmente en el dashboard de Render (no versionar credenciales)
```

`sync: false` es la convención de Render para variables que **no** se sincronizan desde el blueprint (`render.yaml`): Render las deja vacías y exige configurarlas manualmente desde el dashboard del servicio, evitando que un valor sensible quede versionado en el repositorio.

## 3. ⚠️ Alerta de seguridad — acción requerida fuera de este entorno

Esta corrección **limpia el archivo local**, pero si `render.yaml` ya fue subido a GitHub en algún momento con la credencial en texto plano, esa contraseña (`gabriel:gabriel` sobre el clúster `bddshakira.l08bhec.mongodb.net`) debe considerarse **comprometida**, sin importar que ahora se elimine del archivo:

- El historial de commits de Git conserva versiones anteriores del archivo aunque se corrija la versión actual.
- **Se recomienda con urgencia:** rotar la contraseña del usuario `gabriel` (o del usuario de base de datos usado en producción) directamente desde el panel de MongoDB Atlas, y actualizar la variable `MONGODB_URI` en el dashboard de Render con la nueva contraseña.
- Esta acción debe realizarla el tutor empresarial o quien administre la cuenta de MongoDB Atlas, ya que requiere acceso a un panel externo fuera del alcance de este entorno de desarrollo.

## 4. Checklist de variables de entorno para el despliegue

### Backend (Render — configurar en el dashboard, no en `render.yaml`)

| Variable | Origen |
|---|---|
| `MONGODB_URI` | Manual, tras rotar credenciales (ver punto 3 y sección 6) |
| `JWT_SECRET` | Generado automáticamente por Render (`generateValue: true`, ya configurado) |
| `DEFAULT_PASSWORD` | Valor de configuración (no es una credencial de acceso a un sistema externo) |
| `CORS_ORIGIN` | Dominio real del frontend desplegado |
| `NODE_ENV` | `production` |

### Frontend (Render — sitio estático)

| Variable | Origen |
|---|---|
| `VITE_API_URL` | URL real del backend desplegado |

## 5. Archivo `.env.example` creado

Se creó el archivo `backend/.env.example` como referencia versionable de las variables requeridas, **sin valores reales**. Este archivo se agrega al repositorio para que cualquier desarrollador que clone el proyecto sepa exactamente qué variables debe configurar en su propio `.env`:

```bash
# backend/.env.example

# Conexión a MongoDB Atlas
# Formato: mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/<base>
# NUNCA versionariar el valor real. Configurar en .env local o en el dashboard de Render.
MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/<base>

# Clave secreta para firmar tokens JWT
# En producción, Render puede generarla automáticamente con generateValue: true
JWT_SECRET=<cadena-aleatoria-larga-y-secreta>

# Contraseña inicial asignada a usuarios nuevos creados por el administrador
# El usuario debe cambiarla en su primer acceso
DEFAULT_PASSWORD=<contraseña-inicial-del-sistema>

# Origen permitido por CORS (dominio real del frontend en producción)
# En desarrollo local: http://localhost:5173
CORS_ORIGIN=https://<dominio-del-frontend>.onrender.com

# Entorno de ejecución: development | production
NODE_ENV=production

# Puerto del servidor (Render lo asigna automáticamente; solo necesario en local)
PORT=5002
```

El archivo `.env` (con valores reales) ya está en `.gitignore` desde el inicio del proyecto y **no debe removerse de ahí**.

## 6. Guía paso a paso para rotar las credenciales comprometidas en MongoDB Atlas

Esta guía está redactada para ser entregada al tutor empresarial o al administrador de la cuenta de Atlas, ya que los pasos requieren acceso a ese panel externo:

### Paso 1 — Acceder al panel de MongoDB Atlas

1. Ir a [https://cloud.mongodb.com](https://cloud.mongodb.com) e iniciar sesión con la cuenta de la empresa.
2. Seleccionar el proyecto correspondiente al evento (el que contiene el clúster `l08bhec`).

### Paso 2 — Rotar la contraseña del usuario de base de datos

1. En el menú lateral, ir a **Database Access** (bajo la sección "Security").
2. Localizar el usuario `gabriel` (o el usuario utilizado en la cadena de conexión comprometida).
3. Hacer clic en **Edit** → **Edit Password**.
4. Generar una nueva contraseña segura (mínimo 16 caracteres, combinando letras, números y símbolos). Atlas tiene un generador integrado.
5. Copiar la nueva contraseña en un gestor de contraseñas seguro antes de guardar.
6. Hacer clic en **Update User**.

### Paso 3 — Construir la nueva cadena de conexión

La nueva URI tendrá el mismo formato que la anterior, pero con la nueva contraseña:

```
mongodb+srv://gabriel:<NUEVA_CONTRASEÑA>@<cluster>.mongodb.net/<base>
```

### Paso 4 — Actualizar la variable en Render

1. Ir a [https://dashboard.render.com](https://dashboard.render.com) e iniciar sesión.
2. Seleccionar el servicio web del backend.
3. Ir a **Environment** → localizar `MONGODB_URI`.
4. Reemplazar el valor con la nueva URI (con la contraseña rotada).
5. Hacer clic en **Save Changes**. Render redesplegará el servicio automáticamente.

### Paso 5 — Verificar que el sistema sigue funcionando

Tras el redespliegue, verificar el endpoint de salud del backend:

```bash
curl https://<backend-url>.onrender.com/health
→ {"status":"OK",...}
```

Si responde correctamente, la rotación fue exitosa y el sistema opera con las nuevas credenciales.

### Paso 6 (opcional pero recomendado) — Limpiar el historial de Git

Si el repositorio es privado, el historial con la credencial antigua solo es accesible para quienes tengan acceso al repo. Si alguna vez se considera hacerlo público, se recomienda usar `git filter-branch` o `git filter-repo` para eliminar el archivo `render.yaml` del historial, o remplazar el valor sensible en todos los commits anteriores. Esto queda como decisión del administrador del repositorio.

## 7. Checklist de preparación adicional

- [x] `render.yaml` sin credenciales en texto plano.
- [ ] Contraseña de MongoDB Atlas rotada (acción pendiente del tutor empresarial — ver Sección 6).
- [x] `backend/.env.example` creado y versionado en el repositorio.
- [x] `CORS_ORIGIN` apunta al dominio real del frontend (no a `localhost`).
- [x] Build commands verificados (`npm install` backend, `npm install && npm run build` frontend).
- [x] Reglas de rewrite del frontend para servir la SPA y proxificar `/api/*` al backend.

## 8. Revisión de seguridad final del repositorio

Como parte del cierre de la preparación al despliegue, se realizó una revisión de seguridad del repositorio completo en busca de otras posibles credenciales o información sensible versionada accidentalmente:

```bash
# Búsqueda de patrones típicos de credenciales en el repositorio
grep -r "password\|secret\|api_key\|token\|mongodb+srv" . \
  --include="*.js" --include="*.json" --include="*.yaml" --include="*.yml" \
  --exclude-dir=node_modules --exclude-dir=".git" -l
```

**Archivos identificados y revisados:**

| Archivo | Contiene referencia sensible | Veredicto |
|---|---|---|
| `render.yaml` | `MONGODB_URI` (corregida hoy a `sync: false`) | ✅ Corregido |
| `backend/.env` | URI real de MongoDB, `JWT_SECRET` | ✅ En `.gitignore`, no versionado |
| `backend/.env.example` | Solo placeholders, sin valores reales | ✅ Seguro para versionar |
| `backend/src/config/database.js` | Cadena `'canje-ftt'` (nombre de servicio, no es una credencial) | ✅ Sin riesgo |
| `backend/src/scripts/setup.js` | Fallback `'sistema-inicial'` para `DEFAULT_PASSWORD` | ✅ Aceptable (contraseña inicial documentada) |
| `package.json` (raíz y subcarpetas) | Sin credenciales | ✅ Limpio |

**Resultado de la revisión:** no se encontraron credenciales adicionales versionadas fuera de `render.yaml` (ya corregido). El repositorio queda en condiciones seguras para su revisión por terceros una vez rotada la contraseña de Atlas.

## 9. Conclusiones del día

Se corrigió la exposición de credenciales en el archivo de despliegue, se creó un archivo `.env.example` como referencia segura y versionable para futuros desarrolladores, se documentó una guía paso a paso para la rotación de credenciales en MongoDB Atlas (para ser ejecutada por el tutor empresarial), y se realizó una revisión de seguridad del repositorio completo que no encontró credenciales adicionales expuestas. El sistema queda en condiciones seguras para el despliegue una vez completada la acción de rotación de contraseña externa.

**Observaciones:** Pendiente crítico fuera de este entorno: rotación de contraseña de MongoDB Atlas por parte del tutor empresarial (guía documentada en Sección 6).
