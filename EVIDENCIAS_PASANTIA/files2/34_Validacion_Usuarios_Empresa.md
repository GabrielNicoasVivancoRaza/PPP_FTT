# Validación con Usuarios de la Empresa

**Actividad N°:** 34
**Fecha:** 16/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Presentar el sistema funcionando de punta a punta al tutor empresarial, simulando el flujo real de trabajo de un punto de canje (rol Staff) y de la administración (rol Jefe), para obtener retroalimentación directa antes de los ajustes finales, y aprovechar el tiempo posterior a la reunión para iniciar el borrador del material de capacitación identificado como pendiente.

## 2. Participantes

| Nombre | Rol en la validación |
|---|---|
| Miguel Vivanco | Tutor Empresarial — validación desde la perspectiva de negocio y operación del evento |
| Gabriel | Pasante — conducción de la demostración |

## 3. Preparación previa a la sesión de validación

Antes de iniciar la demostración con el tutor, se preparó el entorno de prueba y los datos usados en la sesión, para que la validación fuera reproducible y no dependiera de datos de producción:

### 3.1 Usuarios de prueba utilizados

| Usuario | Contraseña | Rol | Punto de trabajo asignado |
|---|---|---|---|
| `sistema` | `sistema-inicial` (cambiada en la demo) | Jefe | — (acceso global) |
| `staff_demo` | `Staff2026!` | Staff | Punto de Venta "Entrada Principal" |
| `staff_nuevo` | (contraseña inicial, cambio forzado) | Staff | Punto de Venta "Entrada VIP" |

### 3.2 Tickets de prueba seleccionados para la demostración

Se seleccionaron los siguientes tickets del conjunto de datos de prueba, eligiendo uno por cada escenario a demostrar:

| Ticket ID | Nombre del titular | Localidad | Estado inicial | Usado en paso |
|---|---|---|---|---|
| TKT-00001 | Juan Pérez | Platea Alta | Disponible | Paso 3 (canje individual) |
| TKT-00002 | María López | Platea Baja | Disponible | Paso 4 (canje masivo, junto con TKT-00003) |
| TKT-00003 | Carlos Ruiz | Platea Baja | Disponible | Paso 4 (canje masivo) |
| TKT-00001 | Juan Pérez | Platea Alta | Canjeado (tras paso 3) | Paso 5 (verificar bloqueo de doble canje) |
| TKT-00004 | Ana Torres | VIP | Canjeado previamente | Paso 6 (reimpresión con motivo) |

### 3.3 Limpieza post-demostración

Tras la sesión, los registros de canje generados durante la demostración (Pasos 3, 4 y 6) fueron identificados en la colección de Auditoría con el campo `detalles: "DEMO_VALIDACION_DIA34"`, permitiendo filtrarlos o eliminarlos sin afectar datos reales del evento en caso de haberse usado sobre la base de producción.

## 4. Guion de validación ejecutado

| Paso | Flujo demostrado | Rol simulado | Duración aprox. |
|---|---|---|---|
| 1 | Login y redirección automática según rol (`/dashboard` vs `/tickets`) | Jefe y Staff | 5 min |
| 2 | Búsqueda de un boleto por nombre y por Ticket ID | Staff | 5 min |
| 3 | Canje individual de un boleto, con "Otro" como quien retira (parentesco + celular) | Staff | 8 min |
| 4 | Selección múltiple y canje masivo de varios boletos | Jefe | 8 min |
| 5 | Intento de canje de un boleto ya canjeado (verificar bloqueo) | Staff | 5 min |
| 6 | Reimpresión de un boleto con motivo | Jefe | 5 min |
| 7 | Consulta del Dashboard (gráfico de avance y evolución diaria) | Jefe | 8 min |
| 8 | Consulta de Auditoría filtrando por tipo de operación | Jefe | 8 min |
| 9 | Gestión de un Punto de Venta y sus localidades | Jefe | 8 min |
| 10 | Cambio de contraseña en primer acceso | Staff (usuario nuevo) | 5 min |

**Duración total de la sesión de demostración:** aproximadamente 65 minutos.

## 5. Retroalimentación recibida del tutor empresarial

### Comentarios positivos

- **Velocidad del flujo de canje:** el flujo de canje individual y masivo se percibe como suficientemente rápido para el contexto de una fila de personas esperando; la confirmación visual (fila en verde) es clara y no requiere explicación adicional al operador.
- **Separación de roles:** la diferencia entre lo que ve un Staff frente a un Jefe corresponde exactamente a la operación real de un evento. El personal de punto de canje no necesita ni debe ver estadísticas globales; esto fue validado explícitamente como correcto.
- **Bloqueo de doble canje:** el tutor destacó que el bloqueo visual al intentar canjear un boleto ya canjeado (Paso 5) es suficientemente claro para que el operador entienda que no debe entregar la entrada de nuevo.

### Observaciones y pedidos

- **Guía visual para Staff:** se solicitó que para la capacitación de la Semana 8 se prepare una guía visual simple (paso a paso, con capturas) enfocada en el rol Staff, ya que es el perfil con menor familiaridad técnica. El tutor mencionó que el personal de punto de canje típicamente tiene entre 18 y 25 años y usará el sistema por primera vez el día del evento.
- **Documentación de credenciales iniciales:** se pidió reconfirmar antes del despliegue que las credenciales de acceso inicial (`sistema` / `sistema-inicial`) queden documentadas de forma clara para quien administre el sistema en producción, dado el hallazgo corregido en la Semana 6 sobre la doble creación de administrador.
- **Sin objeciones funcionales:** no se solicitaron nuevas funcionalidades en esta validación; el alcance entregado fue declarado conforme para la operación del evento.

## 6. Resultado de la validación

| Aspecto validado | Resultado |
|---|---|
| Flujo operativo de canje (individual y masivo) | ✅ Validado por el tutor empresarial |
| Diferenciación de experiencia Jefe/Staff | ✅ Validado |
| Reimpresión controlada | ✅ Validado |
| Dashboard y auditoría | ✅ Validado |
| Gestión de puntos de venta | ✅ Validado |

## 7. Acuerdos y siguientes pasos

1. Se aprueba el sistema para pasar a la etapa de ajustes finales (Día 35).
2. Se incorpora como pendiente para la Semana 8 la elaboración de material de capacitación visual orientado al rol Staff.
3. Se ratifica que las credenciales iniciales del sistema deben quedar documentadas de forma explícita en el manual técnico de cierre.

## 8. Borrador inicial del material de capacitación (trabajo posterior a la reunión)

Aprovechando el tiempo disponible después de la sesión de validación, se elaboró un primer borrador de la guía de capacitación para el rol Staff, que será refinada formalmente en el Día 38. Este borrador inicial recoge los puntos que el tutor identificó como más importantes durante la demostración:

### Estructura del borrador (v0.1)

1. **¿Qué hace este sistema?** — una sola oración explicativa, sin tecnicismos.
2. **Cómo entrar** — URL, usuario y contraseña (a completar con datos reales del evento).
3. **Cómo buscar un boleto** — búsqueda por nombre vs. por ID.
4. **Cómo canjear** — pasos del formulario, campo "quién retira", confirmación visual (fila verde).
5. **Qué hacer si el boleto ya está canjeado** — no entregar la entrada, avisar al Jefe.
6. **Cómo salir** — botón de Cerrar Sesión, importancia de no dejar la sesión abierta.

**Pendientes para la versión final (Día 38):**
- Completar con datos de acceso reales del evento (URL de producción, credenciales de Staff).
- Agregar capturas de pantalla de cada paso.
- Revisar el lenguaje con el tutor empresarial para asegurar que es comprensible para el perfil de usuario identificado.

## 9. Conclusiones del día

La validación con el tutor empresarial confirma que el sistema cumple con la operación real esperada para el canje de boletos, sin observaciones que impliquen cambios funcionales, únicamente ajustes de documentación y capacitación a preparar en la última semana. Se aprovechó el tiempo posterior a la reunión para elaborar el borrador inicial de la guía de capacitación, adelantando trabajo del Día 38.

**Observaciones:** Sin objeciones funcionales; borrador v0.1 de guía de capacitación elaborado; pendientes formales de documentación y capacitación programados para la Semana 8.
