import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <span className="navbar-brand">
          �️ FeelTheTickets — Canje
        </span>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {user?.rol === 'jefe' && (
              <>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link text-white" 
                    onClick={() => navigate('/dashboard')}
                  >
                    Dashboard
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link text-white" 
                    onClick={() => navigate('/users')}
                  >
                    Usuarios
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link text-white" 
                    onClick={() => navigate('/audit')}
                  >
                    Auditoría
                  </button>
                </li>
              </>
            )}
            
            <li className="nav-item">
              <button 
                className="nav-link btn btn-link text-white" 
                onClick={() => navigate('/tickets')}
              >
                Tickets
              </button>
            </li>
          </ul>
          
          <ul className="navbar-nav">
            <li className="nav-item dropdown">
              <a 
                className="nav-link dropdown-toggle text-white" 
                href="#" 
                role="button" 
                data-bs-toggle="dropdown"
              >
                {user?.rol}
              </a>
              <ul className="dropdown-menu">
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
                    className="dropdown-item" 
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
