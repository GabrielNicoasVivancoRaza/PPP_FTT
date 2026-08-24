import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { printerSettingsService, printRequestService } from '../services';
import socketService from '../services/socket';
import Swal from 'sweetalert2';
import { hasAnyRole } from '../utils/roles';
import 'bootstrap/dist/css/bootstrap.min.css';

const SQUADUP_PRINT_URL = 'https://www.squadup.com/api/dashboard/payments/print_boca_tickets?ids=';

const PrintQueuePage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(null); // null = cargando
  const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' | 'enviados'
  const [pendientes, setPendientes] = useState([]);
  const [enviados, setEnviados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);

  const fetchPendientes = useCallback(async () => {
    try {
      const response = await printRequestService.getQueue('pendiente');
      if (response.success) setPendientes(response.data.requests);
    } catch (error) {
      console.error('Error al obtener solicitudes pendientes:', error);
    }
  }, []);

  const fetchEnviados = useCallback(async () => {
    try {
      const response = await printRequestService.getQueue('enviada');
      if (response.success) setEnviados(response.data.requests);
    } catch (error) {
      console.error('Error al obtener solicitudes enviadas:', error);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await printerSettingsService.getSettings();
      if (response.success) setEnabled(response.data.enabled);
    } catch (error) {
      console.error('Error al obtener configuración de impresión:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchPendientes(), fetchEnviados()]);
      setLoading(false);
    };
    init();
  }, [fetchSettings, fetchPendientes, fetchEnviados]);

  // Tiempo real: unirse a la sala de impresores y refrescar ante cambios
  useEffect(() => {
    if (!token) return;

    socketService.connect(token);
    socketService.joinImpresores();

    const onQueueUpdated = () => {
      fetchPendientes();
      fetchEnviados();
    };
    const onSettingsUpdated = (data) => setEnabled(data.enabled);

    socketService.on('print-queue-updated', onQueueUpdated);
    socketService.on('printer-settings-updated', onSettingsUpdated);

    return () => {
      socketService.off('print-queue-updated', onQueueUpdated);
      socketService.off('printer-settings-updated', onSettingsUpdated);
    };
  }, [token, fetchPendientes, fetchEnviados]);

  // Agrupar solicitudes pendientes por color
  const grupos = useMemo(() => {
    const mapa = new Map();
    pendientes.forEach(req => {
      const key = req.color || 'sin-color';
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key).push(req);
    });
    // Ordenar: colores definidos primero, "sin-color" al final
    return Array.from(mapa.entries()).sort(([a], [b]) => {
      if (a === 'sin-color') return 1;
      if (b === 'sin-color') return -1;
      return a.localeCompare(b);
    });
  }, [pendientes]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectGrupo = (grupoRequests) => {
    const ids = grupoRequests.map(r => r._id);
    const todosSeleccionados = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => todosSeleccionados ? next.delete(id) : next.add(id));
      return next;
    });
  };

  // Paso 1: enviar a imprimir (abre SquadUp y pasa la(s) solicitud(es) a "Enviados")
  const enviarAImprimir = async (reqs) => {
    if (reqs.length === 0) return;

    const transactionIds = [...new Set(reqs.map(r => r.transactionId))];
    const totalTickets = reqs.reduce((sum, r) => sum + r.ticketIds.length, 0);

    // Abrir SquadUp de forma síncrona (evita bloqueo de pop-ups)
    window.open(`${SQUADUP_PRINT_URL}${transactionIds.join(',')}`, '_blank');

    try {
      setBusy(true);
      const response = await printRequestService.sendToPrint(reqs.map(r => r._id));
      if (response.success) {
        setPendientes(prev => prev.filter(r => !reqs.some(sel => sel._id === r._id)));
        setSelected(prev => {
          const next = new Set(prev);
          reqs.forEach(r => next.delete(r._id));
          return next;
        });
        await fetchEnviados();
        Swal.fire({
          title: 'Enviado a imprimir',
          text: `${reqs.length} solicitud(es) · ${totalTickets} ticket(s). Confírmalo en "Enviados a Imprimir" cuando salga bien.`,
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error al enviar a imprimir:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo enviar a imprimir', 'error');
    } finally {
      setBusy(false);
    }
  };

  const enviarSeleccionados = () => {
    const reqs = pendientes.filter(r => selected.has(r._id));
    enviarAImprimir(reqs);
  };

  // Reintentar: vuelve a abrir SquadUp para esa transacción, sigue en "Enviados"
  const volverAImprimir = async (req) => {
    window.open(`${SQUADUP_PRINT_URL}${req.transactionId}`, '_blank');
    try {
      setBusy(true);
      await printRequestService.sendToPrint([req._id]);
      await fetchEnviados();
    } catch (error) {
      console.error('Error al reintentar impresión:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo reintentar', 'error');
    } finally {
      setBusy(false);
    }
  };

  // Paso 2: confirmar que la impresión salió bien -> pasa a Impresos
  const confirmarCorrecta = async (req) => {
    try {
      setBusy(true);
      const response = await printRequestService.confirmPrint([req._id]);
      if (response.success) {
        setEnviados(prev => prev.filter(r => r._id !== req._id));
        Swal.fire({
          title: 'Impresión confirmada',
          text: `${req.ticketIds.length} ticket(s) marcados como impresos`,
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error al confirmar impresión:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo confirmar', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!hasAnyRole(user, ['impresor_cola', 'jefe'])) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">No tiene permisos para acceder a esta página.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (enabled === false) {
    return (
      <div className="container-fluid">
        <div className="alert alert-info">
          La función de impresión no está habilitada actualmente. Contacte al jefe del evento.
        </div>
      </div>
    );
  }

  const totalPendientes = pendientes.length;
  const totalTicketsPendientes = pendientes.reduce((sum, r) => sum + r.ticketIds.length, 0);
  const totalSeleccionados = selected.size;

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Cola de Impresión</h2>
        <button
          type="button"
          className="btn btn-outline-dark btn-sm"
          onClick={() => navigate('/escanearTicket')}
          title="Buscar un ticket escaneando su código de barras/QR"
        >
          <i className="fas fa-qrcode me-1"></i>Escanear
        </button>
      </div>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'pendientes' ? 'active' : ''}`}
            onClick={() => setActiveTab('pendientes')}
          >
            Pendientes
            {totalPendientes > 0 && <span className="badge bg-warning text-dark ms-2">{totalPendientes}</span>}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'enviados' ? 'active' : ''}`}
            onClick={() => setActiveTab('enviados')}
          >
            Enviados a Imprimir
            {enviados.length > 0 && <span className="badge bg-info text-dark ms-2">{enviados.length}</span>}
          </button>
        </li>
      </ul>

      {activeTab === 'pendientes' && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <p className="text-muted mb-0">
              {totalPendientes} solicitud(es) pendiente(s) · {totalTicketsPendientes} ticket(s) en total
            </p>
            <button
              className="btn btn-primary"
              disabled={totalSeleccionados === 0 || busy}
              onClick={enviarSeleccionados}
            >
              <i className="fas fa-print me-2"></i>
              Enviar a imprimir seleccionados ({totalSeleccionados})
            </button>
          </div>

          {pendientes.length === 0 ? (
            <div className="alert alert-secondary">No hay solicitudes de impresión pendientes.</div>
          ) : (
            grupos.map(([color, grupoRequests]) => {
              const tiposGrupo = [...new Set(grupoRequests.flatMap(r => r.tipos))];
              const ticketsGrupo = grupoRequests.reduce((sum, r) => sum + r.ticketIds.length, 0);
              const todosSeleccionados = grupoRequests.every(r => selected.has(r._id));

              return (
                <div className="card mb-3" key={color}>
                  <div
                    className="card-header d-flex justify-content-between align-items-center"
                    style={{
                      backgroundColor: color === 'sin-color' ? '#e5e7eb' : color,
                      color: color === 'sin-color' ? '#374151' : '#fff'
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className="rounded-circle"
                        style={{ width: 14, height: 14, backgroundColor: color === 'sin-color' ? '#9ca3af' : color, border: '2px solid rgba(255,255,255,0.6)' }}
                      ></span>
                      <strong>{color === 'sin-color' ? 'Sin color / Mixto' : (tiposGrupo.join(', ') || 'Sin tipo')}</strong>
                      <span className="badge bg-light text-dark ms-2">
                        {grupoRequests.length} solicitud(es) · {ticketsGrupo} ticket(s)
                      </span>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-light"
                        onClick={() => toggleSelectGrupo(grupoRequests)}
                      >
                        {todosSeleccionados ? 'Deseleccionar grupo' : 'Seleccionar grupo'}
                      </button>
                      <button
                        className="btn btn-sm btn-dark"
                        disabled={busy}
                        onClick={() => enviarAImprimir(grupoRequests)}
                      >
                        <i className="fas fa-print me-1"></i>
                        Imprimir todo el color ({ticketsGrupo})
                      </button>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0 align-middle">
                        <thead>
                          <tr>
                            <th style={{ width: 40 }}></th>
                            <th>Transaction ID</th>
                            <th>Tickets</th>
                            <th>Punto de trabajo</th>
                            <th>Solicitado por</th>
                            <th>Hora</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupoRequests.map(req => (
                            <tr key={req._id}>
                              <td>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selected.has(req._id)}
                                  onChange={() => toggleSelect(req._id)}
                                />
                              </td>
                              <td className="fw-semibold">{req.transactionId}</td>
                              <td>{req.ticketIds.length}</td>
                              <td>{req.puntoTrabajo || '-'}</td>
                              <td>{req.solicitadoPor?.nombre || req.solicitadoPor?.usuario || '-'}</td>
                              <td>{new Date(req.fechaSolicitud).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-dark"
                                  disabled={busy}
                                  onClick={() => enviarAImprimir([req])}
                                >
                                  <i className="fas fa-print me-1"></i>Imprimir
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {activeTab === 'enviados' && (
        <>
          <p className="text-muted">
            Confirme cada solicitud una vez que verifique que el boleto salió bien de la impresora física.
          </p>
          {enviados.length === 0 ? (
            <div className="alert alert-secondary">No hay solicitudes enviadas esperando confirmación.</div>
          ) : (
            <div className="card">
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0 align-middle">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Tipo</th>
                        <th>Tickets</th>
                        <th>Punto de trabajo</th>
                        <th>Enviado por</th>
                        <th>Hora de envío</th>
                        <th style={{ minWidth: 260 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {enviados.map(req => (
                        <tr key={req._id}>
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
                          <td>{req.enviadoPor?.nombre || req.enviadoPor?.usuario || '-'}</td>
                          <td>{req.fechaEnvio ? new Date(req.fechaEnvio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-outline-warning"
                                disabled={busy}
                                onClick={() => volverAImprimir(req)}
                              >
                                <i className="fas fa-redo me-1"></i>Volver a Imprimir
                              </button>
                              <button
                                className="btn btn-sm btn-success"
                                disabled={busy}
                                onClick={() => confirmarCorrecta(req)}
                              >
                                <i className="fas fa-check me-1"></i>Impresión Correcta
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PrintQueuePage;
