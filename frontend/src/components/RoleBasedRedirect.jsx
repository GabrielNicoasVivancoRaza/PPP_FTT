import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoles } from '../utils/roles';

// Con varios roles a la vez, se aterriza en la pantalla del rol "más
// completo" que tenga: jefe ve todo desde el dashboard igual, así que gana
// sobre cualquier otro rol operativo que también tenga.
const PRIORIDAD_ATERRIZAJE = [
  { rol: 'jefe', ruta: '/dashboard' },
  { rol: 'staff', ruta: '/tickets' },
  { rol: 'impresor_solo', ruta: '/tickets' },
  { rol: 'impresor_cola', ruta: '/cola-impresion' },
  { rol: 'importador', ruta: '/importar-csv' }
];

const RoleBasedRedirect = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roles = getRoles(user);
  const destino = PRIORIDAD_ATERRIZAJE.find(({ rol }) => roles.includes(rol));

  return <Navigate to={destino ? destino.ruta : '/tickets'} replace />;
};

export default RoleBasedRedirect;
