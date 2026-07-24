# Validación con Usuarios de la Empresa

**Actividad N°:** 34
**Fecha:** 16/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Presentar el sistema funcionando de punta a punta al tutor empresarial, simulando el flujo real de trabajo de un punto de canje (rol Staff) y de la administración (rol Jefe), para obtener retroalimentación directa antes de los ajustes finales.

## 2. Participantes

| Nombre | Rol en la validación |
|---|---|
| Miguel Vivanco | Tutor Empresarial — validación desde la perspectiva de negocio y operación del evento |
| Gabriel | Pasante — conducción de la demostración |

## 3. Guion de validación ejecutado

| Paso | Flujo demostrado | Rol simulado |
|---|---|---|
| 1 | Login y redirección automática según rol (`/dashboard` vs `/tickets`) | Jefe y Staff |
| 2 | Búsqueda de un boleto por nombre y por Ticket ID | Staff |
| 3 | Canje individual de un boleto, con "Otro" como quien retira (parentesco + celular) | Staff |
| 4 | Selección múltiple y canje masivo de varios boletos | Jefe |
| 5 | Intento de canje de un boleto ya canjeado (verificar bloqueo) | Staff |
| 6 | Reimpresión de un boleto con motivo | Jefe |
| 7 | Consulta del Dashboard (gráfico de avance y evolución diaria) | Jefe |
| 8 | Consulta de Auditoría filtrando por tipo de operación | Jefe |
| 9 | Gestión de un Punto de Venta y sus localidades | Jefe |
| 10 | Cambio de contraseña en primer acceso | Staff (usuario nuevo) |

## 4. Retroalimentación recibida del tutor empresarial

- **Positivo:** el flujo de canje individual y masivo se percibe como suficientemente rápido para el contexto de una fila de personas esperando; la confirmación visual (fila en verde) es clara.
- **Positivo:** la separación de lo que ve un Staff frente a un Jefe corresponde exactamente a la operación real de un evento (el personal de punto de canje no necesita ni debe ver estadísticas globales).
- **Observación:** se solicita que, para la capacitación de la Semana 8, se prepare una guía visual simple (paso a paso con capturas) enfocada en el rol Staff, ya que es el perfil con menor familiaridad técnica.
- **Observación:** se pide reconfirmar antes del despliegue que las credenciales de acceso inicial (`sistema` / `sistema-inicial`) queden documentadas de forma clara para quien administre el sistema en producción, dado el hallazgo corregido en la Semana 6 sobre la doble creación de administrador.
- **Sin objeciones** sobre el alcance funcional entregado; no se solicitan nuevas funcionalidades en esta validación.

## 5. Resultado de la validación

| Aspecto validado | Resultado |
|---|---|
| Flujo operativo de canje (individual y masivo) | ✅ Validado por el tutor empresarial |
| Diferenciación de experiencia Jefe/Staff | ✅ Validado |
| Reimpresión controlada | ✅ Validado |
| Dashboard y auditoría | ✅ Validado |
| Gestión de puntos de venta | ✅ Validado |

## 6. Acuerdos y siguientes pasos

1. Se aprueba el sistema para pasar a la etapa de ajustes finales (Día 35).
2. Se incorpora como pendiente para la Semana 8 la elaboración de material de capacitación visual orientado al rol Staff.
3. Se ratifica que las credenciales iniciales del sistema deben quedar documentadas de forma explícita en el manual técnico de cierre.

## 7. Conclusiones del día

La validación con el tutor empresarial confirma que el sistema cumple con la operación real esperada para el canje de boletos, sin observaciones que impliquen cambios funcionales, únicamente ajustes de documentación y capacitación a preparar en la última semana.

**Observaciones:** Sin objeciones funcionales; se registran pendientes de documentación y capacitación para la Semana 8.
