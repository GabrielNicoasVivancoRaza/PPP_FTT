# Pruebas de Autenticación y Usuarios

**Actividad N°:** 20
**Fecha:** 26/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Diseñar y ejecutar un plan de pruebas funcionales sobre los módulos de autenticación, gestión de usuarios y control de acceso desarrollados durante la semana, verificando que se cumplen las reglas de negocio y los criterios de aceptación definidos en las historias de usuario (HU-01 y RF-09).

## 2. Alcance de la verificación

Las pruebas de este documento fueron verificadas mediante **revisión funcional del código implementado** (trazando cada regla contra su implementación real en los controladores). La ejecución end-to-end contra un ambiente vivo (servidor + MongoDB + interfaz) queda como actividad complementaria a realizar en conjunto con el tutor empresarial antes de pasar a producción.

## 3. Casos de prueba — Autenticación

| ID | Caso de prueba | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| PA-01 | Login con credenciales válidas | POST `/api/auth/login` con usuario y contraseña correctos | 200, devuelve `token` y datos de usuario | ✅ Conforme |
| PA-02 | Login con contraseña incorrecta | POST `/api/auth/login` con contraseña errónea | 401 "Credenciales inválidas" (mismo mensaje que usuario inexistente) | ✅ Conforme |
| PA-03 | Login con usuario inexistente | POST `/api/auth/login` con usuario que no existe | 401 "Credenciales inválidas" | ✅ Conforme |
| PA-04 | Login con usuario inactivo | Usuario con `activo: false` intenta login con contraseña correcta | 401 "Credenciales inválidas" | ✅ Conforme |
| PA-05 | Acceso a ruta protegida sin token | GET `/api/tickets` sin header `Authorization` | 401 "No token, autorización denegada" | ✅ Conforme |
| PA-06 | Acceso con token expirado/inválido | GET `/api/tickets` con token corrupto o vencido (>8h) | 401 "Token no válido" | ✅ Conforme |
| PA-07 | Cambio de contraseña en primer acceso | POST `/api/auth/change-password` sin `currentPassword`, con `primerAcceso: true` | 200, `primerAcceso` pasa a `false` | ✅ Conforme |
| PA-08 | Cambio de contraseña normal sin indicar la actual | POST `/api/auth/change-password` con `primerAcceso: false` y sin `currentPassword` | 400 "Contraseña actual es requerida" | ✅ Conforme |
| PA-09 | Cambio de contraseña con contraseña actual incorrecta | POST `/api/auth/change-password` con `currentPassword` erróneo | 400 "Contraseña actual incorrecta" | ✅ Conforme |
| PA-10 | Contraseña nueva demasiado corta | `newPassword` con menos de 6 caracteres | 400 "La nueva contraseña debe tener al menos 6 caracteres" | ✅ Conforme |
| PA-11 | Registro de auditoría en login/logout/cambio de contraseña | Ejecutar login, logout y cambio de contraseña | Se crean registros `AuditLog` con `tipo` correspondiente | ✅ Conforme |

## 4. Casos de prueba — Gestión de Usuarios

| ID | Caso de prueba | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| PU-01 | Crear usuario Staff sin punto de trabajo | POST `/api/users` con `rol: staff` y sin `puntoTrabajo` | 400 "Punto de trabajo es requerido para staff e impresor" | ✅ Conforme |
| PU-02 | Crear usuario con nombre de usuario duplicado | POST `/api/users` con `usuario` ya existente | 400 "El usuario ya existe" | ✅ Conforme |
| PU-03 | Crear usuario Jefe (sin punto de trabajo) | POST `/api/users` con `rol: jefe`, sin `puntoTrabajo` | 201, usuario creado con `puntoTrabajo: undefined` | ✅ Conforme |
| PU-04 | Contraseña por defecto en usuario nuevo | Crear cualquier usuario nuevo | Se asigna `DEFAULT_PASSWORD` y `primerAcceso: true` | ✅ Conforme |
| PU-05 | Un Staff intenta crear/editar/eliminar usuarios | Llamar `POST/PUT/DELETE /api/users` autenticado como Staff | 403 "No tiene permisos para realizar esta acción" | ✅ Conforme |
| PU-06 | Jefe intenta desactivar su propia cuenta | PUT `/api/users/:id` (su propio id) con `activo: false` | 400 "No puedes desactivar tu propia cuenta" | ✅ Conforme |
| PU-07 | Jefe intenta eliminar su propia cuenta | DELETE `/api/users/:id` (su propio id) | 400 "No puedes eliminar tu propia cuenta" | ✅ Conforme |
| PU-08 | Listado de usuarios excluye inactivos | GET `/api/users` tras desactivar un usuario | La lista no incluye usuarios con `activo: false` | ✅ Conforme |

## 5. Casos de prueba — Roles y Permisos (incluye verificación del fix del día 19)

| ID | Caso de prueba | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| PR-01 | Staff intenta ver dashboard/estadísticas | GET `/api/tickets/stats` autenticado como Staff | 403 Forbidden | ✅ Conforme |
| PR-02 | Staff intenta ver auditoría | GET `/api/audit` autenticado como Staff | 403 Forbidden | ✅ Conforme |
| PR-03 | Staff intenta reimprimir un ticket | POST `/api/tickets/:id/reprint` autenticado como Staff | 403 Forbidden | ✅ Conforme |
| PR-04 | **Staff intenta canje masivo directamente por API** | POST `/api/tickets/bulk-canje` autenticado como Staff | 403 Forbidden (antes del fix del día 19: 200 OK, indebido) | ✅ Conforme — verificado tras la corrección |
| PR-05 | Jefe ejecuta canje masivo | POST `/api/tickets/bulk-canje` autenticado como Jefe con lista de Ticket IDs | 200, boletos actualizados vía `bulkWrite` | ✅ Conforme |
| PR-06 | Staff filtra tickets fuera de su punto de trabajo | GET `/api/tickets?puntoTrabajo=OTRO` autenticado como Staff | El filtro de `puntoTrabajo` enviado se ignora; solo ve su propio punto de trabajo | ✅ Conforme |

## 6. Hallazgos de esta ronda de pruebas

- **PR-04** confirma de forma concreta que la corrección aplicada el día 19 (Semana 4) cierra efectivamente la brecha detectada en la revisión de diseño de la Semana 3: antes del cambio, un Staff podía ejecutar canje masivo llamando directamente a la API aunque la interfaz no se lo mostrara.
- No se identificaron nuevos hallazgos de seguridad en autenticación o gestión de usuarios durante esta ronda.

## 7. Conclusiones del día

El módulo de autenticación, gestión de usuarios y control de acceso cumple con las reglas de negocio definidas, incluyendo la corrección de permisos aplicada esta misma semana. Se recomienda complementar esta verificación con una ejecución en vivo (Postman/interfaz real) antes del cierre del proyecto, como parte de la etapa de integración y pruebas (Semana 7).

**Observaciones:** Pruebas verificadas por inspección funcional del código; pendiente ejecución en vivo en ambiente de pruebas.
