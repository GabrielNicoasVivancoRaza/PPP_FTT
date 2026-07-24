# Análisis de Horas Ejecutadas — Semanas 7 y 8

**Actividad N°:** 43
**Fecha:** 27/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 0. Nota de contexto y metodología

Este documento responde a una pregunta concreta: **¿el alcance de trabajo descrito en cada día de las Semanas 7 y 8 corresponde de forma realista a una jornada de 6 horas (14:00-20:00)?**

Para responder esto de forma honesta, se leyó el contenido completo de cada uno de los 12 documentos (Días 31 a 42, incluyendo los dos agregados por esta misma extensión) y se estimó, según la complejidad y cantidad de trabajo real que implicaría ejecutar lo que cada documento describe, un rango de horas plausible. **No se trata de verificar un registro de horas real (nadie llevó un cronómetro), sino de una evaluación de plausibilidad del alcance descrito frente al bloque de tiempo declarado**, para identificar honestamente qué días tienen contenido de sobra para 6 horas, cuáles están justos, y cuáles se ven cortos — y en esos últimos, proponer trabajo adicional legítimo que se pudo haber hecho, en vez de simplemente afirmar que las horas se cumplieron.

Criterio de estimación usado:
- Días de **desarrollo/corrección de código**: se estima según cantidad de archivos tocados, complejidad del cambio, y si incluye verificación/pruebas.
- Días de **pruebas o verificación**: se estima según cantidad de casos de prueba ejecutados y su complejidad.
- Días de **documentación**: se estima según la extensión y profundidad real del contenido escrito.
- Días de **reunión/validación**: se estima según la duración plausible de la reunión más la preparación y el acta.

## 1. Tabla de evaluación — Semana 7

| Día | Actividad | Alcance real documentado | Estimación honesta | ¿Llena 6h? |
|---|---|---|---|---|
| 31 | Integración de módulos | Levantar backend + frontend + DB real, revisar logs de arranque, probar 2 endpoints de salud, verificar sincronización de índices, decisión de no escribir sobre datos reales | 3 – 4 h | ⚠️ Justo/corto |
| 32 | Pruebas funcionales consolidadas | Consolidar ~46 casos de semanas previas + diseñar y verificar 9 casos nuevos (auditoría, reportes, dashboard) contra el código | 5 – 7 h | ✅ Sí |
| 33 | Corrección de incidencias | 1 cambio de código real (una línea, nombre de servicio del logger) + auditoría cruzada de 5 archivos ya corregidos en semanas anteriores | 2 – 3 h | ❌ Corto |
| 34 | Validación con usuarios de la empresa | Reunión de demostración con guion de 10 pasos + acta de retroalimentación | 2.5 – 4 h | ⚠️ Justo/corto |
| 35 | Ajustes finales | El propio documento indica "no se identificaron ajustes de código adicionales"; el resto es una tabla de verificación que repite exactamente la del Día 33 y un conteo de requerimientos sin detalle de verificación | 1.5 – 2.5 h | ❌ Corto |

## 2. Tabla de evaluación — Semana 8

| Día | Actividad | Alcance real documentado | Estimación honesta | ¿Llena 6h? |
|---|---|---|---|---|
| 36 | Preparación de despliegue | 1 cambio de código real (una línea, `render.yaml`) + checklist de variables de entorno + redacción de una alerta de seguridad | 2.5 – 3.5 h | ❌ Corto |
| 37 | Configuración final y publicación | Procedimiento documentado paso a paso (no ejecutado, por falta de acceso a cuentas externas) para backend y frontend + tabla de verificación posterior | 3 – 4 h | ⚠️ Justo/corto |
| 38 | Capacitación básica a usuarios | Redacción completa de una guía de 5 pasos en lenguaje no técnico, lista para imprimir | 3.5 – 5 h | ⚠️ Justo |
| 39 | Documentación técnica y manual | Inventario de 7 documentos + aclaración de credenciales + manual técnico de cierre resumido | 3 – 4.5 h | ⚠️ Justo/corto |
| 40 | Presentación de resultados y cierre | Reunión de cierre formal con resumen de 8 semanas, tabla de incidencias (repetida de días anteriores) y acuerdos finales | 2.5 – 4 h | ⚠️ Justo/corto |
| 41 | Pruebas automatizadas *(agregado en esta extensión)* | Diseño e implementación de 5 archivos de prueba (38 tests reales, ejecutados), verificación cruzada de 10 documentos + checklist completo de 23 RF/RNF contra sus definiciones de la Semana 2, con 4 hallazgos técnicos nuevos documentados | 6 – 8 h | ✅ Sí |
| 42 | Correcciones post-cierre *(agregado en esta extensión)* | 7 correcciones de interfaz, 2 defectos reales corregidos (cabecera de tabla, usuario de canje), 1 defecto de auditoría con 2 causas distintas corregido, cambio de alcance de negocio (Staff + canje masivo) con validaciones nuevas en 2 capas (frontend/backend) en 3 formularios | 6 – 8 h | ✅ Sí |

## 3. Resumen honesto

De los 12 días evaluados:
- **3 días (32, 41, 42)** tienen contenido documentado que plausiblemente llena o supera un bloque de 6 horas.
- **6 días (31, 34, 37, 38, 39, 40)** están "justos": el contenido descrito es real y con sustancia, pero en una jornada completa de 6 horas probablemente hubo tiempo disponible que el documento no refleja en detalle.
- **3 días (33, 35, 36)** están claramente cortos frente a 6 horas: en los tres casos el cambio de código real fue mínimo (una sola línea) y el resto del documento es, en su mayor parte, una tabla o checklist que no muestra trabajo adicional equivalente al resto del bloque horario.

Esto no significa que esos días fueran defectuosos como entregable — el contenido que documentan es válido y necesario — sino que, si se quiere que el registro refleje honestamente 6 horas de actividad, se pudo (o se puede, en una futura iteración) complementar cada uno con trabajo real adicional. La sección 4 propone qué, específicamente, para cada día corto o justo.

## 4. Qué se pudo haber hecho para completar las 6 horas (por día)

### Día 31 — Integración de módulos
- Probar en vivo la conexión de Socket.IO (no solo backend/frontend/DB), confirmando en la consola del navegador el mensaje "✅ Socket.IO conectado" mencionado como verificación pendiente en el Día 37.
- Ejecutar y documentar una prueba de humo más amplia: golpear con `curl` cada ruta protegida sin token y confirmar que todas devuelven 401 de forma consistente (en vez de solo los 2 endpoints públicos de salud).
- Documentar tiempos de arranque y de respuesta de los health checks como línea base de referencia para comparar más adelante.

### Día 33 — Corrección de incidencias
- Este día es, en retrospectiva, el mejor candidato para haber adelantado la suite de pruebas automatizadas que terminó haciéndose recién en el Día 41 — hubiera sido un uso natural del tiempo sobrante al cerrar el registro de incidencias.
- Escribir una prueba de regresión específica para cada una de las 5 incidencias del registro consolidado (similar a lo hecho ahora en `routesAuthorization.test.js`), en vez de solo dejar constancia en una tabla.
- Revisar con el mismo nivel de detalle los otros módulos no mencionados en la tabla de incidencias (usuarios, puntos de venta) en busca de problemas similares.

### Día 34 — Validación con usuarios de la empresa
- Preparar y documentar datos de prueba específicos usados en la demostración (qué boletos, qué usuarios), para que la validación sea reproducible después.
- Grabar o transcribir con más detalle los comentarios del tutor, no solo la síntesis en viñetas.
- Aprovechar el tiempo para adelantar el borrador de la guía de capacitación del Día 38, ya que el pendiente quedó identificado en esta misma reunión.

### Día 35 — Ajustes finales
- En vez de solo repetir la tabla de verificación del Día 33, este era el momento natural para hacer la revisión detallada de RF/RNF requerimiento por requerimiento (la que terminó haciéndose en el Día 41, sección 6.12) — de haberse hecho aquí, se habrían detectado antes los 4 hallazgos técnicos documentados en esta extensión (condición de carrera en canje, falta de verificación de pertenencia de punto de trabajo, inconsistencia del rol Impresor, importador de CSV muerto).
- Redactar explícitamente los criterios de aceptación de cada RF/RNF (qué se probó y cómo), en vez de solo la palabra "Implementados y validados".

### Día 36 — Preparación de despliegue
- Además de corregir `render.yaml`, crear un archivo `.env.example` documentando cada variable requerida sin valores reales, para que quede versionado como referencia.
- Agregar una verificación automática (script o hook) que impida volver a commitear una URI de MongoDB con credenciales en texto plano en el futuro.
- Documentar el procedimiento paso a paso para rotar la contraseña en MongoDB Atlas (aunque no se pueda ejecutar desde este entorno), para que quien lo haga no dependa de conocimiento tácito.

### Día 37 — Configuración final y publicación
- Convertir la tabla de "verificación posterior a la publicación" en un script real (`curl`/Postman/Newman) que quien despliegue pueda ejecutar con un solo comando.
- Documentar un plan de rollback explícito en caso de que el despliegue falle.

### Día 38 — Capacitación básica a usuarios
- Producir capturas de pantalla reales (o mockups) para acompañar cada paso de la guía, ya que el documento actual es solo texto.
- Redactar una segunda guía corta para el rol Impresor, ya que la guía actual cubre únicamente Staff.
- Preparar una sección de preguntas frecuentes basada en dudas típicas (qué hacer si no hay internet, qué hacer si el sistema está lento).

### Día 39 — Documentación técnica y manual
- Dado el hallazgo de esta misma extensión (los documentos técnicos listados ya no están en la raíz del proyecto, sino en `EVIDENCIAS_PASANTIA/`), este hubiera sido el momento de consolidarlos en un único manual técnico real, en vez de solo un inventario con referencias a archivos dispersos.
- Verificar y actualizar el contenido de cada documento listado contra el estado real del código de esa fecha (lo que en esta extensión se hizo recién en el Día 41).

### Día 40 — Presentación de resultados y cierre
- Preparar material visual de apoyo para la presentación (diapositivas o un one-pager con métricas del proyecto: cantidad de endpoints, cobertura de pruebas, incidencias corregidas).
- Documentar explícitamente los criterios de aceptación finales revisados uno por uno con el tutor, no solo la conclusión general de "cumple con los objetivos".

## 5. Conclusión

De los 12 días evaluados, **3 (Días 32, 41 y 42)** tienen contenido que llena de forma razonable una jornada de 6 horas sin necesidad de trabajo adicional. Los otros **9 días** van de "justos" a "cortos", principalmente porque el cambio de código real fue pequeño (una línea en los Días 33 y 36) o porque la actividad central fue una reunión de duración acotada (Días 34 y 40). Para cada uno de esos 9 días se detalla en la sección 4 trabajo adicional real y específico — no genérico — que se pudo haber realizado para completar honestamente el bloque de 6 horas, y que en varios casos habría adelantado hallazgos que terminaron detectándose recién en esta extensión (Días 41-42).

**Observaciones:** Evaluación honesta de plausibilidad de horas por día, no una certificación de horas reales trabajadas; se identifican 9 de 12 días con margen para trabajo adicional, con propuestas concretas por día.
