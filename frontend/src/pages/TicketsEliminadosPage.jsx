import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services';
import { getCedula, getLast4 } from '../utils/ticketFields';
import socketService from '../services/socket';
import { hasAnyRole } from '../utils/roles';
import 'bootstrap/dist/css/bootstrap.min.css';

const ROLES_PERMITIDOS = ['jefe', 'importador'];

const TicketsEliminadosPage = () => {
  const { user, token } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, yaCanjeados: 0, sinCanjear: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchEliminados = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await ticketService.getTicketsEliminados({ page, limit: 50 });
      if (response.success) {
        setTickets(response.data.tickets);
        setResumen(response.data.resumen);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Error al obtener tickets eliminados:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEliminados(1);
  }, [fetchEliminados]);

  // Refrescar cuando una importación detecte nuevos eliminados
  useEffect(() => {
    if (!token) return;
    socketService.connect(token);
    const onEliminados = () => fetchEliminados(1);
    socketService.on('tickets-eliminados-detectados', onEliminados);
    return () => socketService.off('tickets-eliminados-detectados', onEliminados);
  }, [token, fetchEliminados]);

  if (!hasAnyRole(user, ROLES_PERMITIDOS)) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">No tiene permisos para acceder a esta página.</div>
      </div>
    );
  }

  const formatearFecha = (fecha) =>
    fecha ? new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : '-';

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h2 className="mb-1">Tickets Eliminados</h2>
        <p className="text-muted mb-0">
          Tickets que dejaron de aparecer en el CSV del evento (anulados o reembolsados en SquadUp).
          No se borran de la base: quedan aquí para poder auditarlos.
        </p>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h3 className="mb-0">{resumen.total}</h3>
              <small className="text-muted">Eliminados en total</small>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center border-danger">
            <div className="card-body">
              <h3 className="mb-0 text-danger">{resumen.yaCanjeados}</h3>
              <small className="text-muted">Ya habían sido canjeados</small>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h3 className="mb-0">{resumen.sinCanjear}</h3>
              <small className="text-muted">Sin canjear</small>
            </div>
          </div>
        </div>
      </div>

      {resumen.yaCanjeados > 0 && (
        <div className="alert alert-danger">
          <i className="fas fa-triangle-exclamation me-2"></i>
          <strong>Atención:</strong> {resumen.yaCanjeados} ticket(s) fueron eliminados del evento
          <strong> después de haber sido canjeados</strong>. Alguien ya retiró esos boletos.
        </div>
      )}

      {loading ? (
        <div className="d-flex justify-content-center mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="alert alert-secondary">No hay tickets eliminados.</div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Estado</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Asiento</th>
                    <th>Categoría</th>
                    <th>Cédula</th>
                    <th>Pago</th>
                    <th>Ticket ID</th>
                    <th>Transaction ID</th>
                    <th>Detectado</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket['Ticket ID']} className={ticket.eliminadoTrasCanje ? 'table-danger' : ''}>
                      <td>
                        {ticket.eliminadoTrasCanje ? (
                          <span className="badge bg-danger">Ya canjeado</span>
                        ) : (
                          <span className="badge bg-secondary">Sin canjear</span>
                        )}
                      </td>
                      <td><strong>{`${ticket['First Name'] || ''} ${ticket['Last Name'] || ''}`.trim()}</strong></td>
                      <td><small>{ticket['Email']}</small></td>
                      <td><small>{ticket['Seat']}</small></td>
                      <td><small>{ticket['Ticket']}</small></td>
                      <td><small>{getCedula(ticket) || '-'}</small></td>
                      <td><small>{getLast4(ticket)}</small></td>
                      <td><code style={{ fontSize: '0.8em' }}>{ticket['Ticket ID']}</code></td>
                      <td><code style={{ fontSize: '0.8em' }}>{ticket['Transaction ID']}</code></td>
                      <td><small>{formatearFecha(ticket.fechaEliminado)}</small></td>
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
                      <button className="page-link" onClick={() => fetchEliminados(p)}>{p}</button>
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

export default TicketsEliminadosPage;
