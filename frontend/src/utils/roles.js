// Utilidades compartidas para el sistema de roles múltiples: un usuario
// puede tener más de un rol a la vez (p. ej. "staff" + "impresor_cola"),
// y sus permisos son la UNIÓN de lo que cada rol habilita.
export const ROLES = ['jefe', 'staff', 'impresor_solo', 'impresor_cola', 'importador'];

export const ROLE_INFO = {
  jefe: { label: 'Jefe', className: 'role-badge-jefe' },
  staff: { label: 'Staff', className: 'role-badge-staff' },
  impresor_solo: { label: 'Impresor', className: 'role-badge-impresor_solo' },
  impresor_cola: { label: 'Impresor (Cola)', className: 'role-badge-impresor_cola' },
  importador: { label: 'Importador', className: 'role-badge-importador' }
};

// Devuelve los roles de un usuario (el objeto que guarda el login/contexto
// de auth). Cuentas creadas antes de soportar varios roles no tienen
// "roles" poblado todavía: se usa el "rol" viejo (string único) como
// respaldo en vez de asumir que "roles" siempre está lleno.
export const getRoles = (user) => {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  const unico = user.role || user.rol;
  return unico ? [unico] : [];
};

export const hasRole = (user, rol) => getRoles(user).includes(rol);

export const hasAnyRole = (user, roles) => {
  const propios = getRoles(user);
  return roles.some(r => propios.includes(r));
};

// Roles que son cuentas operativas globales, no atadas a un punto de
// trabajo. Cualquier otro rol sí necesita uno. true si ALGUNO de los
// roles dados lo requiere.
export const ROLES_SIN_PUNTO_TRABAJO = ['jefe', 'importador'];
export const necesitaPuntoTrabajo = (roles) => roles.some(r => !ROLES_SIN_PUNTO_TRABAJO.includes(r));
