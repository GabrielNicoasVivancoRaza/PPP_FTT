# Preparación para Despliegue Local o en la Nube (Render)

**Actividad N°:** 36
**Fecha:** 20/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Dejar lista la configuración de despliegue (`render.yaml`) para publicar backend y frontend, resolviendo antes que nada el hallazgo de seguridad pendiente desde la Semana 2/7: credenciales de MongoDB en texto plano dentro del repositorio.

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
| `MONGODB_URI` | Manual, tras rotar credenciales (ver punto 3) |
| `JWT_SECRET` | Generado automáticamente por Render (`generateValue: true`, ya configurado) |
| `DEFAULT_PASSWORD` | Valor de configuración (no es una credencial de acceso a un sistema externo) |
| `CORS_ORIGIN` | Dominio real del frontend desplegado |
| `NODE_ENV` | `production` |

### Frontend (Render — sitio estático)

| Variable | Origen |
|---|---|
| `VITE_API_URL` | URL real del backend desplegado |

## 5. Checklist de preparación adicional

- [x] `render.yaml` sin credenciales en texto plano.
- [ ] Contraseña de MongoDB Atlas rotada (acción pendiente del tutor empresarial, fuera de este entorno).
- [x] `CORS_ORIGIN` apunta al dominio real del frontend (no a `localhost`).
- [x] Build commands verificados (`npm install` backend, `npm install && npm run build` frontend).
- [x] Reglas de rewrite del frontend para servir la SPA y proxificar `/api/*` al backend.

## 6. Conclusiones del día

Se corrigió la exposición de credenciales en el archivo de despliegue y se dejó documentado un checklist claro de variables de entorno, incluyendo una alerta explícita sobre la necesidad de rotar la contraseña real de MongoDB Atlas antes de considerar el sistema listo para producción, ya que esa acción excede el alcance de este entorno de desarrollo.

**Observaciones:** Pendiente crítico fuera de este entorno: rotación de contraseña de MongoDB Atlas por parte del tutor empresarial.
