import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <div className="container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center">
      <div className="card shadow" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="card-body text-center">
          <h1 className="card-title text-primary mb-4">
            🎵 Sistema Shakira
          </h1>
          <p className="card-text mb-4">
            Sistema de gestión de boletos funcionando correctamente
          </p>
          <div className="alert alert-success">
            ✅ Frontend conectado
          </div>
          <div className="alert alert-info">
            🔗 Backend: http://localhost:5002
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/login'}
          >
            Ir al Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
