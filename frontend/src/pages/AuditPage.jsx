import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ROLE_INFO, hasRole, getRoles } from '../utils/roles';
import 'bootstrap/dist/css/bootstrap.min.css';

const AuditPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tipo: '',
    usuario: '',
    ticketId: '',
    fechaInicio: '',
    fechaFin: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const tiposLog = [
    'impresion',
    'reimpresion',
    'impresion_cola',
    'config_impresion',
    'canje',
    'canje_masivo',
    'importacion_csv',
    'login',
    'logout',
    'creacion_usuario',
    'cambio_password'
  ];

  const TIPO_LABELS = {
    impresion: 'Impresión',
    reimpresion: 'Reimpresión',
    impresion_cola: 'Impresión (Cola)',
    config_impresion: 'Config. Impresión',
    canje: 'Canje',
    canje_masivo: 'Canje Masivo',
    importacion_csv: 'Importación CSV',
    login: 'Login',
    logout: 'Logout',
    creacion_usuario: 'Creación Usuario',
    cambio_password: 'Cambio Contraseña'
  };

  useEffect(() => {
    if (hasRole(user, 'jefe')) {
      fetchLogs();
    }
  }, [user, pagination.page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      // Remover filtros vacíos
      Object.keys(params).forEach(key => {
        if (params[key] === '') {
          delete params[key];
        }
      });

      const response = await api.get('/audit', { params });
      setLogs(response.data.logs);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        pages: response.data.pagination.pages
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      alert('Error al cargar logs de auditoría');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getTipoClass = (tipo) => {
    const classes = {
      impresion: 'table-tag-active',
      reimpresion: 'table-tag-pending',
      impresion_cola: 'table-tag-active',
      config_impresion: 'table-tag-pending',
      canje: 'table-tag-active',
      canje_masivo: 'table-tag-info',
      importacion_csv: 'table-tag-importador',
      login: 'table-tag-info',
      logout: 'table-tag-neutral',
      creacion_usuario: 'table-tag-info',
      cambio_password: 'table-tag-danger'
    };
    return classes[tipo] || 'table-tag-neutral';
  };

  const formatDetalles = (log) => {
    if (!log.detalles) return '-';

    const detalles = [];
    if (log.detalles.quienRetira) detalles.push(`Retira: ${log.detalles.quienRetira}`);
    if (log.detalles.celular) detalles.push(`Tel: ${log.detalles.celular}`);
    if (log.detalles.motivo) detalles.push(`Motivo: ${log.detalles.motivo}`);
    if (log.detalles.usuarioCreado) detalles.push(`Usuario: ${log.detalles.usuarioCreado}`);
    if (log.detalles.impreso) detalles.push(`Impreso: ${log.detalles.ticketsImpresosTransaccion || 1} ticket(s)`);
    if (log.detalles.accion) detalles.push(`Acción: ${log.detalles.accion}`);
    if (log.detalles.ticketsImpresos !== undefined) detalles.push(`Impresos: ${log.detalles.ticketsImpresos}`);
    if (log.detalles.solicitudes !== undefined) detalles.push(`Solicitudes: ${log.detalles.solicitudes}`);
    if (log.detalles.colores?.length) detalles.push(`Colores: ${log.detalles.colores.join(', ')}`);
    if (log.detalles.archivo) detalles.push(`Archivo: ${log.detalles.archivo}`);
    if (log.detalles.nuevosAgregados !== undefined) detalles.push(`Nuevos: ${log.detalles.nuevosAgregados}`);
    if (log.detalles.yaExistian !== undefined) detalles.push(`Ya existían: ${log.detalles.yaExistian}`);

    return detalles.join(', ') || '-';
  };

  if (!hasRole(user, 'jefe')) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">
          No tiene permisos para acceder a esta página.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Auditoría del Sistema</h2>
            <button
              className="btn btn-outline-primary"
              onClick={fetchLogs}
            >
              <i className="fas fa-sync"></i> Actualizar
            </button>
          </div>

          {/* Filtros */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Filtros de Búsqueda</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-2">
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.tipo}
                    onChange={(e) => handleFilterChange('tipo', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {tiposLog.map(tipo => (
                      <option key={tipo} value={tipo}>{TIPO_LABELS[tipo] || tipo}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Ticket ID</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={filters.ticketId}
                    onChange={(e) => handleFilterChange('ticketId', e.target.value)}
                    placeholder="Buscar ticket..."
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Fecha Inicio</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={filters.fechaInicio}
                    onChange={(e) => handleFilterChange('fechaInicio', e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Fecha Fin</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={filters.fechaFin}
                    onChange={(e) => handleFilterChange('fechaFin', e.target.value)}
                  />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    className="btn btn-secondary btn-sm w-100"
                    onClick={() => {
                      setFilters({
                        tipo: '',
                        usuario: '',
                        ticketId: '',
                        fechaInicio: '',
                        fechaFin: ''
                      });
                    }}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de logs */}
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
                    <table className="table table-hover table-sm">
                      <thead>
                        <tr>
                          <th>Fecha/Hora</th>
                          <th>Tipo</th>
                          <th>Usuario</th>
                          <th>Rol</th>
                          <th>Punto Trabajo</th>
                          <th>Ticket ID</th>
                          <th>Transaction ID</th>
                          <th>Detalles</th>
                          <th>IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map(log => (
                          <tr key={log._id}>
                            <td className="text-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td>
                              <span className={`table-tag ${getTipoClass(log.tipo)}`}>
                                {TIPO_LABELS[log.tipo] || log.tipo}
                              </span>
                            </td>
                            <td>{log.usuario?.nombre || '-'}</td>
                            <td>
                              {getRoles(log.usuario).length > 0 ? (
                                <div className="d-flex flex-wrap gap-1">
                                  {getRoles(log.usuario).map(r => (
                                    <span key={r} className={`table-tag table-tag-${ROLE_INFO[r] ? r : 'default'}`}>
                                      {(ROLE_INFO[r] || {}).label || r}
                                    </span>
                                  ))}
                                </div>
                              ) : '-'}
                            </td>
                            <td>{log.puntoTrabajo || '-'}</td>
                            <td>
                              {log.ticketId ? (
                                <code>{log.ticketId}</code>
                              ) : '-'}
                            </td>
                            <td>
                              {log.transactionId ? (
                                <code>{log.transactionId}</code>
                              ) : '-'}
                            </td>
                            <td className="text-truncate" style={{ maxWidth: '200px' }}>
                              {formatDetalles(log)}
                            </td>
                            <td className="text-muted small">{log.ip || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {pagination.pages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination pagination-sm justify-content-center">
                        <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(pagination.page - 1)}
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
                                  onClick={() => handlePageChange(pageNumber)}
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
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.pages}
                          >
                            Siguiente
                          </button>
                        </li>
                      </ul>
                      <div className="text-center text-muted">
                        Mostrando página {pagination.page} de {pagination.pages} 
                        ({pagination.total} registros total)
                      </div>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
