# Validación de Funcionalidades Administrativas

**Actividad N°:** 30
**Fecha:** 10/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo de la reunión

Cerrar la Semana 6 validando con el tutor empresarial las funcionalidades administrativas desarrolladas (auditoría, reportes, dashboard, optimización), y revisar un hallazgo detectado durante la revisión del flujo de creación del usuario administrador.

## 2. Participantes

| Nombre | Rol |
|---|---|
| Miguel Vivanco | Tutor Empresarial (FeelTheTickets) |
| Gabriel | Pasante / Desarrollador |

## 3. Documentos presentados

- `26_Implementacion_Auditoria_Operaciones.md`
- `27_Desarrollo_Reportes_Estadisticas.md`
- `28_Implementacion_Dashboard_Administrativo.md`
- `29_Optimizacion_Consultas_Rendimiento.md`

## 4. Hallazgo detectado: doble creación de usuario administrador

Al validar el flujo administrativo completo (desde cero, servidor recién configurado), se detectó que existían **dos mecanismos independientes** para crear el usuario administrador inicial:

1. `config/database.js` → función `createDefaultAdmin()`, ejecutada automáticamente **cada vez que arranca el servidor** si no existe ningún usuario con rol `jefe`. Creaba el usuario `admin@shakira.com` (marca de un evento/proyecto anterior, "Shakira"), con la contraseña de `DEFAULT_PASSWORD`.
2. `scripts/setup.js` → creado explícitamente por el pasante al importar el CSV del evento, que crea el usuario `sistema` / `sistema-inicial` (documentado en `README.md` y `GUIA_RAPIDA.md` como el acceso inicial oficial del sistema).

**Problema:** si el servidor se inicia (`npm start`/`npm run dev`) antes de ejecutar `setup.js` — que es el orden normal en un despliegue nuevo (primero se sube el backend, luego se importa el CSV) — el mecanismo 1 crea primero al usuario `admin@shakira.com`. Cuando después se ejecuta `setup.js`, este ya encuentra un usuario con rol `jefe` y **no crea** el usuario `sistema`/`sistema-inicial`. Resultado: las credenciales documentadas oficialmente para el primer acceso nunca llegan a existir, y el único acceso disponible es uno con marca de un proyecto anterior que no está documentado para el personal de la empresa.

## 5. Corrección aplicada

**Decisión del tutor empresarial:** eliminar la creación automática de `database.js`, dejando `scripts/setup.js` como la **única fuente de verdad** para la creación del usuario administrador inicial, alineado con el flujo documentado oficialmente.

**Archivo modificado:** `backend/src/config/database.js`

```diff
- const mongoose = require('mongoose');
- const User = require('../models/User');
+ const mongoose = require('mongoose');
```

```diff
    // Configurar mongoose para mejor performance
    mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');
    mongoose.set('debug', process.env.NODE_ENV === 'development');
-   
-   // Crear usuario jefe por defecto si no existe
-   await createDefaultAdmin();

  } catch (error) {
```

```diff
- const createDefaultAdmin = async () => {
-   try {
-     const adminExists = await User.findOne({ rol: 'jefe' });
-     if (!adminExists) {
-       const defaultAdmin = new User({
-         nombre: 'Administrador',
-         usuario: 'admin@shakira.com',
-         password: process.env.DEFAULT_PASSWORD,
-         rol: 'jefe',
-         primerAcceso: true
-       });
-       await defaultAdmin.save();
-     }
-   } catch (error) { ... }
- };
- 
  module.exports = connectDB;
```

## 6. Verificación tras la corrección

| Escenario | Antes | Después |
|---|---|---|
| Servidor arranca por primera vez, sin correr `setup.js` | Se crea silenciosamente `admin@shakira.com` | No se crea ningún usuario automáticamente |
| Se ejecuta `setup.js ../../LUMINEERS.csv` en un entorno nuevo | Podía omitir la creación de `sistema` si el servidor ya había arrancado antes | Crea correctamente `sistema` / `sistema-inicial` siempre que no exista ya un jefe |
| Coherencia con la documentación (`README.md`, `GUIA_RAPIDA.md`) | Inconsistente | Alineado — un único flujo documentado y real |

## 7. Puntos revisados y resultado

| Punto revisado | Resultado |
|---|---|
| Módulo de auditoría (middleware + endpoints de consulta) | ✅ Aprobado |
| Reportes y estadísticas agregadas (tickets y auditoría) | ✅ Aprobado |
| Dashboard administrativo (gráficos, filtros, acceso restringido) | ✅ Aprobado |
| Optimizaciones de rendimiento (índices, timeouts, pool de conexión, caché) | ✅ Aprobado |
| Corrección del flujo de creación de administrador inicial | ✅ Aprobado y verificado |

## 8. Acuerdos y siguientes pasos

1. Se aprueban formalmente las funcionalidades administrativas desarrolladas en la Semana 6.
2. Queda cerrado el hallazgo de doble creación de administrador, con `setup.js` como único punto de creación del usuario inicial.
3. Se recomienda que, en el próximo despliegue a producción, se ejecute `setup.js` inmediatamente después del primer arranque del backend, antes de habilitar el acceso público al sistema.

---

**Firma Pasante:** ______________________
**Firma Tutor Empresarial:** ______________________

**Observaciones generales:** Se detectó y corrigió una inconsistencia real en la creación del usuario administrador inicial; el resto de funcionalidades administrativas fue aprobado sin observaciones.
