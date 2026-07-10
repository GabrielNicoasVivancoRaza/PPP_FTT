import React from 'react';

const Unauthorized = () => (
  <div className="container py-5">
    <div className="row justify-content-center">
      <div className="col-md-6">
        <div className="card border-warning">
          <div className="card-body text-center">
            <h3 className="text-warning mb-3">Acceso no autorizado</h3>
            <p className="mb-0">No tienes permisos para ver esta página.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Unauthorized;
