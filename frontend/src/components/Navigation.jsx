import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FTT_LOGO } from '../assets/fttLogo';

const ROLE_INFO = {
  jefe: { label: 'Jefe', className: 'role-badge-jefe' },
  staff: { label: 'Staff', className: 'role-badge-staff' },
  impresor_solo: { label: 'Impresor', className: 'role-badge-impresor_solo' },
  impresor_cola: { label: 'Impresor (Cola)', className: 'role-badge-impresor_cola' }
};

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user?.rol || user?.role || '';
  const roleInfo = ROLE_INFO[role] || { label: role, className: 'role-badge-default' };
  const initial = (user?.nombre || 'U').trim().charAt(0).toUpperCase();

  const navLinkClass = (path) =>
    `nav-link ftt-nav-link btn btn-link px-3${location.pathname === path ? ' active' : ''}`;

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
          <ul className="navbar-nav me-auto ftt-nav">
            {role === 'jefe' && (
              <>
                <li className="nav-item">
                  <button
                    className={navLinkClass('/dashboard')}
                    onClick={() => navigate('/dashboard')}
                  >
                    <i className="fas fa-chart-line me-2"></i>Dashboard
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={navLinkClass('/puntos-venta')}
                    onClick={() => navigate('/puntos-venta')}
                  >
                    <i className="fas fa-store me-2"></i>Puntos de Venta
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={navLinkClass('/users')}
                    onClick={() => navigate('/users')}
                  >
                    <i className="fas fa-users me-2"></i>Usuarios
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={navLinkClass('/audit')}
                    onClick={() => navigate('/audit')}
                  >
                    <i className="fas fa-shield-alt me-2"></i>Auditoría
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={navLinkClass('/impresion-config')}
                    onClick={() => navigate('/impresion-config')}
                  >
                    <i className="fas fa-print me-2"></i>Impresión
                  </button>
                </li>
              </>
            )}

            {(role === 'jefe' || role === 'staff' || role === 'impresor_solo') && (
              <li className="nav-item">
                <button
                  className={navLinkClass('/tickets')}
                  onClick={() => navigate('/tickets')}
                >
                  <i className="fas fa-ticket-alt me-2"></i>Tickets
                </button>
              </li>
            )}

            {role === 'impresor_cola' && (
              <li className="nav-item">
                <button
                  className={navLinkClass('/cola-impresion')}
                  onClick={() => navigate('/cola-impresion')}
                >
                  <i className="fas fa-print me-2"></i>Cola de Impresión
                </button>
              </li>
            )}

            {(role === 'jefe' || role === 'impresor_cola') && (
              <li className="nav-item">
                <button
                  className={navLinkClass('/impresos')}
                  onClick={() => navigate('/impresos')}
                >
                  <i className="fas fa-check-circle me-2"></i>Impresos
                </button>
              </li>
            )}
          </ul>

          {/* Right user menu */}
          <ul className="navbar-nav">
            <li className="nav-item dropdown position-static">
              <button
                className="nav-link dropdown-toggle btn btn-link d-flex align-items-center gap-2 ftt-user-toggle"
                id="userMenu"
                data-bs-toggle="dropdown"
                data-bs-display="static"
                aria-expanded="false"
                title={`${user?.nombre || 'Usuario'} • ${roleInfo.label}`}
              >
                <span className="ftt-user-avatar">{initial}</span>
                <span className="d-none d-sm-flex flex-column align-items-start lh-sm">
                  <span className="fw-semibold user-name text-truncate" style={{maxWidth: 160}}>
                    {user?.nombre || 'Usuario'}
                  </span>
                  <span className={`role-badge ${roleInfo.className}`}>{roleInfo.label}</span>
                </span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow">
                <li className="px-3 py-2 small text-muted d-sm-none d-flex align-items-center gap-2">
                  {user?.nombre || 'Usuario'}
                  <span className={`role-badge ${roleInfo.className}`}>{roleInfo.label}</span>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => navigate('/change-password')}
                  >
                    <i className="fas fa-key me-2 text-muted"></i>Cambiar Contraseña
                  </button>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button
                    className="dropdown-item text-danger"
                    onClick={handleLogout}
                  >
                    <i className="fas fa-right-from-bracket me-2"></i>Cerrar Sesión
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
