// Utilidades compartidas para el sistema de roles múltiples: un usuario
// puede tener más de un rol a la vez (p. ej. "staff" + "impresor_cola"),
// y sus permisos son la UNIÓN de lo que cada rol habilita.
const ROLES = ['jefe', 'staff', 'impresor_solo', 'impresor_cola', 'importador'];

// Roles que son cuentas operativas globales, no atadas a un punto de
// trabajo. Cualquier otro rol sí necesita uno.
const ROLES_SIN_PUNTO_TRABAJO = ['jefe', 'importador'];

// Devuelve los roles de un usuario (documento de Mongo o el objeto plano
// que guarda el frontend). Cuentas creadas antes de soportar múltiples
// roles no tienen "roles" poblado todavía: se usa el "rol" viejo (string
// único) como respaldo en vez de asumir que "roles" siempre está lleno.
const getRoles = (user) => {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  return user.rol ? [user.rol] : [];
};

const hasRole = (user, rol) => getRoles(user).includes(rol);

const hasAnyRole = (user, roles) => {
  const propios = getRoles(user);
  return roles.some(r => propios.includes(r));
};

// true si AL MENOS uno de los roles dados requiere un punto de trabajo
const necesitaPuntoTrabajo = (roles) => roles.some(r => !ROLES_SIN_PUNTO_TRABAJO.includes(r));

module.exports = { ROLES, ROLES_SIN_PUNTO_TRABAJO, getRoles, hasRole, hasAnyRole, necesitaPuntoTrabajo };
