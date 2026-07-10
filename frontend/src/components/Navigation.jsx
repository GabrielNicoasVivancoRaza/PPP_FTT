import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FTT_LOGO } from '../assets/fttLogo';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-ftt shadow-sm sticky-top">
      <div className="container-fluid overflow-visible">
        {/* Brand + Logo (left) */}
        <button 
          className="navbar-brand btn btn-link d-flex align-items-center gap-2 text-decoration-none p-0 m-0"
          onClick={() => navigate('/')}
          title="Inicio"
        >
          <img 
            src={FTT_LOGO}
            onError={(e) => { e.currentTarget.src = '/vite.svg'; }}
            alt="FeelTheTickets"
            className="logo-ftt"
            height="32"
          />
          <span className="brand-text">FeelTheTickets — Canje</span>
        </button>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Left nav links */}
          <ul className="navbar-nav me-auto">
            {(user?.rol === 'jefe' || user?.role === 'jefe') && (
              <>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link text-white px-3" 
                    onClick={() => navigate('/dashboard')}
                  >
                    Dashboard
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link text-white px-3" 
                    onClick={() => navigate('/puntos-venta')}
                  >
                    Puntos de Venta
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link text-white px-3" 
                    onClick={() => navigate('/users')}
                  >
                    Usuarios
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link text-white px-3" 
                    onClick={() => navigate('/audit')}
                  >
                    Auditoría
                  </button>
                </li>
              </>
            )}
            
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-white px-3" 
                onClick={() => navigate('/tickets')}
              >
                Tickets
              </button>
            </li>
          </ul>
          
          {/* Right user menu */}
          <ul className="navbar-nav">
            <li className="nav-item dropdown position-static">
              <button
                className="nav-link dropdown-toggle btn btn-link text-white d-flex align-items-center gap-2"
                id="userMenu"
                data-bs-toggle="dropdown"
                data-bs-display="static"
                aria-expanded="false"
                title={`${user?.nombre || 'Usuario'} • ${user?.rol || user?.role || ''}`}
              >
                <span className="d-none d-sm-inline fw-semibold user-name text-truncate" style={{maxWidth: 180}}>
                  {user?.nombre || 'Usuario'}
                </span>
                <span className="badge text-bg-celeste text-uppercase">{user?.rol || user?.role}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow">
                <li className="px-3 py-2 small text-muted d-sm-none">
                  {user?.nombre || 'Usuario'} • {user?.rol || user?.role}
                </li>
                <li>
                  <button 
                    className="dropdown-item" 
                    onClick={() => navigate('/change-password')}
                  >
                    Cambiar Contraseña
                  </button>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button 
                    className="dropdown-item text-danger" 
                    onClick={handleLogout}
                  >
                    Cerrar Sesión
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
