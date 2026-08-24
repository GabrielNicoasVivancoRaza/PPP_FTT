import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { printRequestService } from '../services';
import socketService from '../services/socket';
import { hasAnyRole } from '../utils/roles';
import 'bootstrap/dist/css/bootstrap.min.css';

const ImpresosPage = () => {
  const { user, token } = useAuth();
  const [impresos, setImpresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });

  const fetchImpresos = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await printRequestService.getQueue('completada', { page, limit: 50 });
      if (response.success) {
        setImpresos(response.data.requests);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Error al obtener el historial de impresos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImpresos(1);
  }, [fetchImpresos]);

  // Tiempo real: refrescar cuando se confirme una nueva impresión
  useEffect(() => {
    if (!token) return;

    socketService.connect(token);
    socketService.joinImpresores();

    const onQueueUpdated = () => fetchImpresos(pagination.page);
    socketService.on('print-queue-updated', onQueueUpdated);

    return () => socketService.off('print-queue-updated', onQueueUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, fetchImpresos]);

  if (!hasAnyRole(user, ['impresor_cola', 'jefe'])) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">No tiene permisos para acceder a esta página.</div>
      </div>
    );
  }

  const totalTickets = impresos.reduce((sum, r) => sum + r.ticketIds.length, 0);

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h2 className="mb-1">Impresos</h2>
        <p className="text-muted mb-0">
          Historial de solicitudes confirmadas como impresas correctamente.
          {!loading && ` ${pagination.total} solicitud(es) · ${totalTickets} ticket(s) en esta página.`}
        </p>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : impresos.length === 0 ? (
        <div className="alert alert-secondary">Todavía no hay impresiones confirmadas.</div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Fecha de impresión</th>
                    <th>Transaction ID</th>
                    <th>Tipo</th>
                    <th>Tickets</th>
                    <th>Punto de trabajo</th>
                    <th>Solicitado por</th>
                    <th>Impreso por</th>
                  </tr>
                </thead>
                <tbody>
                  {impresos.map(req => (
                    <tr key={req._id}>
                      <td>
                        {req.fechaImpresion
                          ? new Date(req.fechaImpresion).toLocaleString('es-ES', {
                              year: 'numeric', month: '2-digit', day: '2-digit',
                              hour: '2-digit', minute: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td className="fw-semibold">{req.transactionId}</td>
                      <td>
                        {req.color ? (
                          <span className="badge" style={{ backgroundColor: req.color, color: '#fff' }}>
                            {req.tipos?.join(', ') || 'Tipo'}
                          </span>
                        ) : (req.tipos?.join(', ') || '-')}
                      </td>
                      <td>{req.ticketIds.length}</td>
                      <td>{req.puntoTrabajo || '-'}</td>
                      <td>{req.solicitadoPor?.nombre || req.solicitadoPor?.usuario || '-'}</td>
                      <td>{req.impresoPor?.nombre || req.impresoPor?.usuario || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination.pages > 1 && (
            <div className="card-footer d-flex justify-content-center">
              <nav>
                <ul className="pagination mb-0">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                    <li key={p} className={`page-item ${p === pagination.page ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => fetchImpresos(p)}>{p}</button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImpresosPage;
