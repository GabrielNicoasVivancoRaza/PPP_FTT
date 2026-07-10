import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const TicketsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    puntoTrabajo: '',
    impreso: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [printForm, setPrintForm] = useState({
    quienRetira: '',
    quienOtro: '',
    celular: ''
  });

  const puntosTrabajoOptions = [
    'boletería norte',
    'boletería sur',
    'centro comercial',
    'punto central',
    'entrada principal'
  ];

  useEffect(() => {
    fetchTickets();
  }, [search, filters, pagination.page]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      const response = await api.get('/tickets', { params });
      setTickets(response.data.tickets);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        pages: response.data.pagination.pages
      }));
    } catch (error) {
      console.error('Error fetching tickets:', error);
      alert('Error al cargar tickets');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (ticket) => {
    setSelectedTicket(ticket);
    setShowPrintModal(true);
  };

  const handlePrintSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/tickets/${selectedTicket['Ticket ID']}/print`, printForm);
      alert('Ticket impreso exitosamente');
      setShowPrintModal(false);
      setPrintForm({ quienRetira: '', quienOtro: '', celular: '' });
      fetchTickets();
    } catch (error) {
      console.error('Error printing ticket:', error);
      alert(error.response?.data?.message || 'Error al imprimir ticket');
    }
  };

  const handleReprint = async (ticket, motivo) => {
    try {
      await api.post(`/tickets/${ticket['Ticket ID']}/reprint`, { motivo });
      alert('Ticket reimpreso exitosamente');
      fetchTickets();
    } catch (error) {
      console.error('Error reprinting ticket:', error);
      alert(error.response?.data?.message || 'Error al reimprimir ticket');
    }
  };

  const canPrint = (ticket) => {
    if (user.rol === 'jefe') return true;
    if (user.rol === 'staff' && !ticket.impreso) return true;
    if (user.rol === 'impresor' && ticket.impreso) return true;
    return false;
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Gestión de Tickets</h2>
            <button
              className="btn btn-outline-primary"
              onClick={fetchTickets}
            >
              <i className="fas fa-sync"></i> Actualizar
            </button>
          </div>

          {/* Filtros */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Búsqueda y Filtros</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <label className="form-label">Buscar</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nombre, email, asiento, cédula, ticket ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                
                {user.rol === 'jefe' && (
                  <div className="col-md-3">
                    <label className="form-label">Punto de Trabajo</label>
                    <select
                      className="form-select"
                      value={filters.puntoTrabajo}
                      onChange={(e) => setFilters({...filters, puntoTrabajo: e.target.value})}
                    >
                      <option value="">Todos</option>
                      {puntosTrabajoOptions.map(punto => (
                        <option key={punto} value={punto}>{punto}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="col-md-3">
                  <label className="form-label">Estado</label>
                  <select
                    className="form-select"
                    value={filters.impreso}
                    onChange={(e) => setFilters({...filters, impreso: e.target.value})}
                  >
                    <option value="">Todos</option>
                    <option value="true">Impresos</option>
                    <option value="false">Pendientes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de tickets */}
          <div className="card">
            <div className="card-body">
              {loading ? (
                <div className="d-flex justify-content-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Asiento</th>
                          <th>Categoría</th>
                          <th>Ticket ID</th>
                          <th>Transaction ID</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map(ticket => (
                          <tr key={ticket['Ticket ID']}>
                            <td>{`${ticket['First Name']} ${ticket['Last Name']}`}</td>
                            <td>{ticket['Email']}</td>
                            <td>{ticket['Seat']}</td>
                            <td>{ticket['Ticket']}</td>
                            <td><code>{ticket['Ticket ID']}</code></td>
                            <td><code>{ticket['Transaction ID']}</code></td>
                            <td>
                              {ticket.impreso ? (
                                <span className="badge bg-success">Impreso</span>
                              ) : (
                                <span className="badge bg-warning">Pendiente</span>
                              )}
                            </td>
                            <td>
                              {canPrint(ticket) && (
                                <>
                                  {!ticket.impreso ? (
                                    <button
                                      className="btn btn-primary btn-sm me-1"
                                      onClick={() => handlePrint(ticket)}
                                    >
                                      Imprimir
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn-warning btn-sm me-1"
                                      onClick={() => {
                                        const motivo = prompt('Motivo de reimpresión:');
                                        if (motivo) {
                                          handleReprint(ticket, motivo);
                                        }
                                      }}
                                    >
                                      Reimprimir
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {pagination.pages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination justify-content-center">
                        <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setPagination(prev => ({...prev, page: prev.page - 1}))}
                            disabled={pagination.page === 1}
                          >
                            Anterior
                          </button>
                        </li>
                        
                        {[...Array(Math.min(5, pagination.pages))].map((_, index) => {
                          const pageNumber = Math.max(1, pagination.page - 2) + index;
                          if (pageNumber <= pagination.pages) {
                            return (
                              <li key={pageNumber} className={`page-item ${pagination.page === pageNumber ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => setPagination(prev => ({...prev, page: pageNumber}))}
                                >
                                  {pageNumber}
                                </button>
                              </li>
                            );
                          }
                          return null;
                        })}
                        
                        <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setPagination(prev => ({...prev, page: prev.page + 1}))}
                            disabled={pagination.page === pagination.pages}
                          >
                            Siguiente
                          </button>
                        </li>
                      </ul>
                      <div className="text-center text-muted">
                        Mostrando página {pagination.page} de {pagination.pages} 
                        ({pagination.total} tickets total)
                      </div>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Modal de impresión */}
          {showPrintModal && (
            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Imprimir Ticket</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowPrintModal(false)}
                    ></button>
                  </div>
                  <form onSubmit={handlePrintSubmit}>
                    <div className="modal-body">
                      <div className="alert alert-info">
                        <strong>Ticket:</strong> {`${selectedTicket['First Name']} ${selectedTicket['Last Name']}`}<br />
                        <strong>Asiento:</strong> {selectedTicket['Seat']}<br />
                        <strong>Ticket ID:</strong> {selectedTicket['Ticket ID']}
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">¿Quién retira? *</label>
                        <select
                          className="form-select"
                          value={printForm.quienRetira}
                          onChange={(e) => {
                            // Limpiar campos relacionados cuando cambia la selección
                            setPrintForm({
                              ...printForm, 
                              quienRetira: e.target.value, 
                              quienOtro: ''
                            });
                          }}
                          required
                        >
                          <option value="">Seleccione una opción</option>
                          <option value="Titular">Titular</option>
                          <option value="Titular Compra">Titular Compra</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>

                      {printForm.quienRetira === 'Otro' && (
                        <div className="mb-3">
                          <label className="form-label">Nombre completo de quien retira *</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Nombre completo de quien retira"
                            value={printForm.quienOtro}
                            onChange={(e) => setPrintForm({...printForm, quienOtro: e.target.value})}
                            required
                          />
                        </div>
                      )}

                      {/* Información adicional para casos de Titular */}
                      {(printForm.quienRetira === 'Titular' || printForm.quienRetira === 'Titular Compra') && (
                        <div className="alert alert-info">
                          <small>
                            <i className="fas fa-info-circle me-1"></i>
                            {printForm.quienRetira === 'Titular' 
                              ? 'El titular del ticket retira personalmente' 
                              : 'El titular de la compra retira personalmente'}
                          </small>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="form-label">Celular *</label>
                        <input
                          type="tel"
                          className="form-control"
                          placeholder="Número de celular"
                          value={printForm.celular}
                          onChange={(e) => setPrintForm({...printForm, celular: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowPrintModal(false)}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Imprimir
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketsPage;
