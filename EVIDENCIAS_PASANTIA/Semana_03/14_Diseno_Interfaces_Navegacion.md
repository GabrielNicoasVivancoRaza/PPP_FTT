# Diseño de Interfaces y Navegación

**Actividad N°:** 14
**Fecha:** 18/06/2026
**Horario:** 14:00 a 20:00
**Tutor Empresarial:** Miguel Vivanco
**Pasante:** Gabriel

---

## 1. Objetivo del día

Diseñar el mapa de navegación del sistema y la estructura general de cada pantalla, diferenciando lo que ve un usuario **Jefe** de lo que ve un usuario **Staff**.

## 2. Mapa de rutas y control de acceso

| Ruta | Acceso | Página |
|---|---|---|
| `/login` | Público | Login |
| `/` | Autenticado | Redirección automática según rol (`RoleBasedRedirect`) |
| `/dashboard` | Jefe | Dashboard |
| `/puntos-venta` | Jefe | PuntosVenta |
| `/tickets` | Jefe, Staff | TicketsPage |
| `/users` | Jefe | UsersPage |
| `/audit` | Jefe | AuditPage |
| `/change-password` | Autenticado (cualquier rol) | ChangePassword |
| `/unauthorized` | Autenticado | Página de acceso denegado |
| `*` (cualquier otra) | — | Redirige a `/` |

## 3. Diseño de redirección post-login

Se diseña un componente `RoleBasedRedirect` que decide automáticamente a dónde enviar al usuario justo después de autenticarse, evitando que cada rol tenga que "saber" a qué URL ir manualmente:

```
Login exitoso
     │
     ▼
¿Rol del usuario?
     │
     ├── jefe   → /dashboard   (panel de control con estadísticas)
     └── staff  → /tickets     (pantalla operativa de canje)
```

## 4. Diseño de protección de rutas (dos niveles)

```
Nivel 1 — Frontend (experiencia de usuario)
  ProtectedRoute verifica:
    a) ¿Hay sesión activa? → si no, redirige a /login
    b) ¿El rol del usuario está en la lista de roles permitidos de la ruta? → si no, redirige a /unauthorized

Nivel 2 — Backend (seguridad real)
  authorize('jefe', ...) en cada endpoint valida el rol nuevamente
  antes de ejecutar cualquier operación (el frontend nunca es la única barrera)
```

## 5. Navegación visible según rol (barra superior)

| Elemento de menú | Jefe | Staff |
|---|---|---|
| Dashboard | ✅ | ❌ |
| Puntos de Venta | ✅ | ❌ |
| Usuarios | ✅ | ❌ |
| Auditoría | ✅ | ❌ |
| Tickets | ✅ | ✅ |
| Cambiar Contraseña (menú de usuario) | ✅ | ✅ |
| Cerrar Sesión | ✅ | ✅ |

Diseño de la barra: logo de marca (FeelTheTickets) a la izquierda, enlaces de navegación condicionados por rol al centro, y menú desplegable del usuario (nombre + badge de rol) a la derecha.

## 6. Estructura general de cada pantalla (wireframe funcional)

### Login
- Logo FTT, formulario (usuario, contraseña), mensaje de contraseña por defecto para primer acceso.

### Dashboard (Jefe)
- Tarjetas de resumen: total de boletos, canjeados, pendientes, % de avance.
- Gráfico de evolución diaria de canjes (Chart.js).
- Gráfico/tabla de distribución de canjes por punto de trabajo.
- Filtros por punto de trabajo y rango de fechas.

### TicketsPage (Jefe, Staff)
- Selector de punto de venta/trabajo (si aplica).
- Barra de búsqueda (nombre, cédula, email, Ticket ID) + filtro por localidad.
- Tabla de boletos con columnas: Nombre, Localidad, Ticket ID, Estado (canjeado/pendiente), Acciones.
- Columna de checkboxes y botón "Canjear Seleccionados (n)" — visible según el rol autorizado para canje masivo.
- Modal de canje individual y modal de canje masivo (formulario: quién retira, parentesco si Otro, celular).
- Indicador de estado de conexión en tiempo real (Socket.IO).

### PuntosVenta (Jefe)
- Listado de puntos de venta con sus localidades asociadas.
- Formulario de creación/edición (nombre, descripción, localidades detectadas del CSV).

### UsersPage (Jefe)
- Listado de usuarios con rol y punto de trabajo.
- Formulario de creación/edición de usuario, con campo de punto de trabajo condicional (solo si rol = staff).

### AuditPage (Jefe)
- Tabla de registros de auditoría: tipo de operación, usuario, ticket, punto de trabajo, fecha.
- Filtros por tipo de operación y usuario.

### ChangePassword (cualquier rol autenticado)
- Formulario de cambio de contraseña, obligatorio en el primer acceso (`primerAcceso: true`).

## 7. Conclusiones del día

Se diseñó el mapa completo de navegación y la estructura funcional de cada pantalla, dejando explícita la diferenciación de experiencia entre los roles Jefe y Staff, y confirmando que la protección de rutas se refuerza en dos niveles (frontend y backend).

**Observaciones:** Sin observaciones.
