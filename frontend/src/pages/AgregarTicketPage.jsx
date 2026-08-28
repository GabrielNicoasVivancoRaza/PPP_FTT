import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services';
import api from '../services/api';
import Swal from 'sweetalert2';
import { onlyAlphanumeric } from '../utils/validators';
import { hasAnyRole } from '../utils/roles';
import 'bootstrap/dist/css/bootstrap.min.css';

const ROLES_PERMITIDOS = ['jefe', 'importador'];

const FORM_VACIO = {
  nombre: '',
  localidad: '',
  cedula: '',
  email: '',
  transactionId: ''
};

const AgregarTicketPage = () => {
  const { user } = useAuth();

  const [form, setForm] = useState(FORM_VACIO);
  const [localidades, setLocalidades] = useState([]);
  const [cargandoLocalidades, setCargandoLocalidades] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ultimoCreado, setUltimoCreado] = useState(null);

  const [manuales, setManuales] = useState([]);
  const [cargandoManuales, setCargandoManuales] = useState(true);
  const [editando, setEditando] = useState(null); // Ticket ID en edición, o null si es alta nueva
  const [busqueda, setBusqueda] = useState('');

  // Orden del listado de tickets agregados a mano: por fecha o por
  // Transaction ID, ascendente o descendente
  const [sortBy, setSortBy] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');

  const cargarManuales = useCallback(async () => {
    try {
      setCargandoManuales(true);
      const response = await ticketService.getTicketsManuales({ sortBy, sortOrder });
      if (response.success) {
        setManuales(response.tickets || []);
      }
    } catch (error) {
      console.error('Error al cargar tickets manuales:', error);
    } finally {
      setCargandoManuales(false);
    }
  }, [sortBy, sortOrder]);

  const handleSort = (campo) => {
    if (sortBy === campo) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(campo);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (campo) => {
    if (sortBy !== campo) return <i className="fas fa-sort text-muted ms-1"></i>;
    return sortOrder === 'asc'
      ? <i className="fas fa-sort-up ms-1"></i>
      : <i className="fas fa-sort-down ms-1"></i>;
  };

  // Cada fila de "Agregar Ticket" en realidad da de alta la TRANSACCIÓN, no
  // necesariamente un solo ticket: cuando se reconcilia con el CSV real se
  // descubre cuántos tickets tenía esa transacción en total (guardado en
  // ticketsEnTransaccionAlReconciliar). Mientras no se reconcilie, todavía
  // no se sabe cuántos son en realidad, así que se cuenta 1 (el que se
  // cargó a mano) hasta que el CSV confirme el número real.
  const cantidadTicketsDe = (t) =>
    t.reconciliadoConCsv && t.ticketsEnTransaccionAlReconciliar > 0
      ? t.ticketsEnTransaccionAlReconciliar
      : 1;

  // Resumen visual: cantidad real de tickets (según transacción), cuántas
  // filas se agregaron a mano, cuántas quedaron canjeadas, y desglose por
  // quién las agregó
  const resumenManuales = useMemo(() => {
    const totalEntradasManuales = manuales.length;
    const canjeados = manuales.filter(t => t.canjeado).length;
    const totalTickets = manuales.reduce((suma, t) => suma + cantidadTicketsDe(t), 0);

    const porUsuarioMap = new Map();
    manuales.forEach(t => {
      const nombre = t.usuarioResponsable?.nombre || 'Sin usuario';
      porUsuarioMap.set(nombre, (porUsuarioMap.get(nombre) || 0) + cantidadTicketsDe(t));
    });
    const porUsuario = Array.from(porUsuarioMap.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return { totalEntradasManuales, canjeados, totalTickets, porUsuario };
  }, [manuales]);

  // Buscador de la tabla "Tickets agregados a mano" (nombre, email, cédula,
  // Transaction ID, Ticket ID) — insensible a tildes y mayúsculas
  const normalizarBusqueda = (texto) =>
    String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const manualesFiltrados = useMemo(() => {
    const termino = normalizarBusqueda(busqueda.trim());
    if (!termino) return manuales;
    return manuales.filter(t => {
      const campos = [
        `${t['First Name'] || ''} ${t['Last Name'] || ''}`,
        t['Email'],
        t['Numero de Cedula:'],
        t['Transaction ID'],
        t['Ticket ID']
      ];
      return campos.some(campo => normalizarBusqueda(campo).includes(termino));
    });
  }, [manuales, busqueda]);

  useEffect(() => {
    const cargarLocalidades = async () => {
      try {
        setCargandoLocalidades(true);
        const response = await api.get('/puntos-venta/localidades/disponibles');
        if (response.data.success) {
          setLocalidades(response.data.data.localidades || []);
        }
      } catch (error) {
        console.error('Error al cargar localidades:', error);
      } finally {
        setCargandoLocalidades(false);
      }
    };
    cargarLocalidades();
  }, []);

  useEffect(() => {
    cargarManuales();
  }, [cargarManuales]);

  if (!hasAnyRole(user, ROLES_PERMITIDOS)) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">No tiene permisos para acceder a esta página.</div>
      </div>
    );
  }

  const handleChange = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const cancelarEdicion = () => {
    setEditando(null);
    setForm(FORM_VACIO);
  };

  const handleEditar = (ticket) => {
    setEditando(ticket['Ticket ID']);
    setForm({
      nombre: `${ticket['First Name'] || ''} ${ticket['Last Name'] || ''}`.trim(),
      localidad: ticket['Ticket'] || '',
      cedula: ticket['Numero de Cedula:'] || '',
      email: ticket['Email'] || '',
      transactionId: ticket['Transaction ID'] || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (ticket) => {
    const result = await Swal.fire({
      title: '¿Eliminar este ticket?',
      html: `Se va a borrar el ticket de <strong>${ticket['First Name']} ${ticket['Last Name']}</strong> agregado a mano.` +
        (ticket.reconciliadoConCsv
          ? '<br/><span class="text-danger">Ojo: este ticket ya se completó con datos reales del CSV (tiene Ticket ID real de SquadUp).</span>'
          : '') +
        '<br/>Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      await ticketService.eliminarTicketManual(ticket['Ticket ID']);
      Swal.fire({ title: 'Ticket eliminado', icon: 'success', timer: 1500, showConfirmButton: false });
      if (editando === ticket['Ticket ID']) cancelarEdicion();
      cargarManuales();
    } catch (error) {
      console.error('Error al eliminar ticket manual:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo eliminar el ticket', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const faltantes = Object.entries(form)
      .filter(([, valor]) => !String(valor).trim())
      .map(([campo]) => campo);

    if (faltantes.length > 0) {
      Swal.fire('Falta información', 'Todos los campos son obligatorios', 'warning');
      return;
    }

    try {
      setGuardando(true);
      if (editando) {
        const response = await ticketService.editarTicketManual(editando, form);
        if (response.success) {
          Swal.fire({ title: 'Ticket actualizado', icon: 'success', timer: 1500, showConfirmButton: false });
          cancelarEdicion();
          cargarManuales();
        }
      } else {
        const response = await ticketService.crearTicketManual(form);
        if (response.success) {
          setUltimoCreado(response.ticket);
          setForm(FORM_VACIO);
          Swal.fire({
            title: 'Ticket creado',
            html: `Queda registrado como <strong>canjeado</strong>.<br/>Ticket ID: <code>${response.ticket['Ticket ID']}</code>`,
            icon: 'success'
          });
          cargarManuales();
        }
      }
    } catch (error) {
      console.error('Error al guardar ticket manual:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo guardar el ticket', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h2 className="mb-1">Agregar Ticket</h2>
        <p className="text-muted mb-0">
          Alta manual de un boleto que no vino en el CSV (por ejemplo, una venta en puerta).
          Se registra directamente como <strong>canjeado</strong>.
        </p>
      </div>

      <div className="alert alert-info">
        <i className="fas fa-circle-info me-2"></i>
        Cuando más adelante se suba el CSV oficial, si trae una fila con la <strong>misma
        Transaction ID y el mismo Email</strong>, este ticket se completa automáticamente con los
        datos reales (Ticket ID, asiento, código de barras) — no se duplica ni se marca como
        eliminado por no tener el ID original de SquadUp.
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong>{editando ? 'Editar ticket' : 'Nuevo ticket'}</strong>
              {editando && (
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cancelarEdicion} disabled={guardando}>
                  Cancelar edición
                </button>
              )}
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    placeholder="Nombre y apellido"
                    disabled={guardando}
                  />
                  <small className="form-text text-muted">
                    El CSV maneja nombre y apellido por separado: la primera palabra se guarda
                    como nombre y el resto como apellido.
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label">Localidad *</label>
                  <select
                    className="form-select"
                    value={form.localidad}
                    onChange={(e) => handleChange('localidad', e.target.value)}
                    disabled={guardando || cargandoLocalidades}
                  >
                    <option value="">
                      {cargandoLocalidades ? 'Cargando localidades...' : 'Seleccione una localidad'}
                    </option>
                    {localidades.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                    {/* Si se está editando un ticket con una localidad que ya no está
                        disponible, se agrega igual para no perderla del select */}
                    {editando && form.localidad && !localidades.includes(form.localidad) && (
                      <option value={form.localidad}>{form.localidad}</option>
                    )}
                  </select>
                  {!cargandoLocalidades && localidades.length === 0 && (
                    <small className="form-text text-warning">
                      No se detectaron localidades. Importe primero el CSV del evento.
                    </small>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Cédula *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.cedula}
                    onChange={(e) => handleChange('cedula', onlyAlphanumeric(e.target.value))}
                    placeholder="Cédula, RUC o pasaporte"
                    disabled={guardando}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    disabled={guardando}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Transaction ID *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.transactionId}
                    onChange={(e) => handleChange('transactionId', e.target.value)}
                    placeholder="Número de transacción"
                    disabled={guardando}
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={guardando}>
                  {guardando ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Guardando...
                    </>
                  ) : editando ? (
                    <>
                      <i className="fas fa-save me-2"></i>Guardar cambios
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus me-2"></i>Agregar ticket
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          {ultimoCreado ? (
            <div className="card border-success">
              <div className="card-header">
                <strong>Último ticket agregado</strong>
              </div>
              <div className="card-body">
                <p className="mb-1"><strong>Nombre:</strong> {`${ultimoCreado['First Name'] || ''} ${ultimoCreado['Last Name'] || ''}`.trim()}</p>
                <p className="mb-1"><strong>Localidad:</strong> {ultimoCreado['Ticket']}</p>
                <p className="mb-1"><strong>Email:</strong> {ultimoCreado['Email']}</p>
                <p className="mb-1"><strong>Ticket ID:</strong> <code>{ultimoCreado['Ticket ID']}</code></p>
                <p className="mb-0"><strong>Transaction ID:</strong> <code>{ultimoCreado['Transaction ID']}</code></p>
              </div>
            </div>
          ) : (
            <div className="alert alert-info mb-0">
              Aquí aparecerá el resumen del último ticket agregado.
            </div>
          )}
        </div>
      </div>

      {/* Resumen visual de tickets agregados a mano */}
      <div className="row g-3 mt-1">
        <div className="col-md-3">
          <div className="card text-center h-100 border-primary">
            <div className="card-body">
              <h3 className="mb-0">{resumenManuales.totalTickets}</h3>
              <small
                className="text-muted"
                title="Cada alta manual da de alta la transacción. Si ya se reconcilió con el CSV, se cuenta la cantidad real de tickets de esa transacción; si todavía no, se cuenta 1."
              >
                Tickets en total (según Transaction ID)
              </small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center h-100">
            <div className="card-body">
              <h3 className="mb-0">{resumenManuales.totalEntradasManuales}</h3>
              <small className="text-muted">Transacciones agregadas a mano</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center h-100 border-success">
            <div className="card-body">
              <h3 className="mb-0 text-success">
                <i className="fas fa-check-circle me-1"></i>{resumenManuales.canjeados}
              </h3>
              <small className="text-muted">Canjeados (deberían ser todas)</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="text-uppercase text-muted small fw-semibold mb-2">Tickets por usuario</h6>
              {resumenManuales.porUsuario.length === 0 ? (
                <small className="text-muted">Todavía no hay tickets agregados.</small>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {resumenManuales.porUsuario.map(({ nombre, cantidad }) => (
                    <span key={nombre} className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                      {nombre}: <strong>{cantidad}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <strong>
            Tickets agregados a mano{' '}
            {busqueda.trim()
              ? `(${manualesFiltrados.length} de ${manuales.length})`
              : `(${manuales.length})`}
          </strong>
          <button className="btn btn-sm btn-outline-secondary" onClick={cargarManuales} disabled={cargandoManuales}>
            {cargandoManuales ? (
              <span className="spinner-border spinner-border-sm me-1"></span>
            ) : (
              <i className="fas fa-sync-alt me-1"></i>
            )}
            Actualizar
          </button>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre, email, cédula, Transaction ID o Ticket ID..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className="btn btn-outline-secondary" type="button" onClick={() => setBusqueda('')}>
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>
          {cargandoManuales ? (
            <div className="d-flex justify-content-center py-3">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : manuales.length === 0 ? (
            <div className="alert alert-secondary mb-0">Todavía no se agregó ningún ticket a mano.</div>
          ) : manualesFiltrados.length === 0 ? (
            <div className="alert alert-secondary mb-0">No se encontró ningún ticket agregado a mano con &quot;{busqueda}&quot;.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Localidad</th>
                    <th>Cédula</th>
                    <th>Email</th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('transactionId')}
                      title="Ordenar por Transaction ID"
                    >
                      Transaction ID {getSortIcon('transactionId')}
                    </th>
                    <th>Ticket ID</th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('fecha')}
                      title="Ordenar por fecha"
                    >
                      Fecha {getSortIcon('fecha')}
                    </th>
                    <th>Estado</th>
                    <th>Agregado por</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {manualesFiltrados.map(ticket => (
                    <tr key={ticket['Ticket ID']}>
                      <td>{`${ticket['First Name'] || ''} ${ticket['Last Name'] || ''}`.trim()}</td>
                      <td>{ticket['Ticket']}</td>
                      <td>{ticket['Numero de Cedula:']}</td>
                      <td>{ticket['Email']}</td>
                      <td><code>{ticket['Transaction ID']}</code></td>
                      <td><code>{ticket['Ticket ID']}</code></td>
                      <td>
                        <small>
                          {ticket.fechaCanje
                            ? new Date(ticket.fechaCanje).toLocaleString('es-ES', {
                                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                              })
                            : '-'}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1 align-items-start">
                          <span
                            className={`table-tag ${ticket.canjeado ? 'table-tag-active' : 'table-tag-pending'}`}
                            title={ticket.canjeado ? 'Ya quedó registrado como canjeado' : 'Todavía no figura como canjeado (revisar)'}
                          >
                            <i className={`fas ${ticket.canjeado ? 'fa-check-circle' : 'fa-circle-exclamation'} me-1`}></i>
                            {ticket.canjeado ? 'Canjeado' : 'Sin canjear'}
                          </span>
                          {ticket.reconciliadoConCsv ? (
                            <span
                              className="table-tag table-tag-active"
                              title="Ya se completó con la fila real del CSV"
                            >
                              Reconciliado
                              {ticket.ticketsEnTransaccionAlReconciliar > 0 && (
                                ` (${ticket.ticketsEnTransaccionAlReconciliar} ticket(s) en la transacción)`
                              )}
                            </span>
                          ) : (
                            <span className="table-tag table-tag-pending">Solo manual</span>
                          )}
                        </div>
                      </td>
                      <td>{ticket.usuarioResponsable?.nombre || '-'}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-icon btn-icon-edit"
                            onClick={() => handleEditar(ticket)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-icon btn-icon-delete"
                            onClick={() => handleEliminar(ticket)}
                            title="Eliminar"
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgregarTicketPage;
