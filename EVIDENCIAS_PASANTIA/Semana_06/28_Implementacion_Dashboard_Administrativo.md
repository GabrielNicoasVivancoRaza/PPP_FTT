# Implementación de Dashboard Administrativo

**Actividad N°:** 28
**Fecha:** 08/07/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Construir la interfaz del Dashboard administrativo (`Dashboard.jsx`), visualizando las estadísticas desarrolladas el día anterior mediante gráficos accesibles para el rol Jefe.

## 2. Componentes visuales implementados

| Componente | Librería | Datos que consume |
|---|---|---|
| Gráfico de dona (Canjeados vs. Pendientes) | Chart.js (`Doughnut`) | `stats.ticketsCanjeados`, `stats.ticketsRestantes` |
| Gráfico de línea (Evolución diaria de canjes) | Chart.js (`Line`) | `stats.evolucionDiaria` (array de `{ _id: fecha, count }`) |
| Tarjetas resumen | React Bootstrap (`Card`) | Totales, porcentaje de avance |
| Distribución por punto de trabajo | Tabla/gráfico adicional | `stats.ticketsPorPunto` |

## 3. Flujo de carga de datos

```
Dashboard.jsx se monta
        │
        ▼
useEffect → fetchStats() → ticketService.getStats()
        │
        ▼
GET /api/tickets/stats (protegido, solo Jefe)
        │
        ▼
setStats(response.stats)
        │
        ▼
Los datasets de Chart.js se recalculan reactivamente
  a partir del nuevo estado `stats`
```

## 4. Configuración de los gráficos

- **Dona:** colores semánticos — verde (`#28a745`) para canjeados, amarillo (`#ffc107`) para pendientes, coherente con la convención de colores ya usada en la tabla de tickets (fila verde = canjeado).
- **Línea:** eje X con las fechas de `evolucionDiaria`, eje Y iniciando siempre en cero (`beginAtZero: true`) para no distorsionar visualmente la magnitud del crecimiento diario.
- Ambos gráficos son `responsive: true`, adaptándose a distintos tamaños de pantalla (el dashboard puede consultarse desde una tablet en el punto de control del evento).

## 5. Filtros disponibles en el Dashboard

Consistente con `getTicketStats`, la interfaz permite filtrar las estadísticas por punto de trabajo y por rango de fechas, de modo que el Jefe pueda comparar el avance entre distintos puntos de venta durante el evento.

## 6. Consideración de acceso

El Dashboard es una ruta protegida (`/dashboard`, `roles={['jefe']}`) tanto a nivel de frontend (`ProtectedRoute`) como de backend (`authorize('jefe')` en `/api/tickets/stats`), consistente con la matriz de permisos consolidada en la Semana 4.

## 7. Conclusiones del día

El Dashboard administrativo queda funcional, presentando de forma visual el estado general del canje (avance, evolución diaria, distribución por punto de trabajo), consumiendo directamente los reportes agregados desarrollados el día anterior.

**Observaciones:** Sin observaciones.
