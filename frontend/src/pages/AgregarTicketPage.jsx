import React, { useState, useEffect, useCallback } from 'react';
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

  const cargarManuales = useCallback(async () => {
    try {
      setCargandoManuales(true);
      const response = await ticketService.getTicketsManuales();
      if (response.success) {
        setManuales(response.tickets || []);
      }
    } catch (error) {
      console.error('Error al cargar tickets manuales:', error);
    } finally {
      setCargandoManuales(false);
    }
  }, []);

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

      <div className="card mt-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Tickets agregados a mano ({manuales.length})</strong>
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
          {cargandoManuales ? (
            <div className="d-flex justify-content-center py-3">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : manuales.length === 0 ? (
            <div className="alert alert-secondary mb-0">Todavía no se agregó ningún ticket a mano.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Localidad</th>
                    <th>Cédula</th>
                    <th>Email</th>
                    <th>Transaction ID</th>
                    <th>Ticket ID</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {manuales.map(ticket => (
                    <tr key={ticket['Ticket ID']}>
                      <td>{`${ticket['First Name'] || ''} ${ticket['Last Name'] || ''}`.trim()}</td>
                      <td>{ticket['Ticket']}</td>
                      <td>{ticket['Numero de Cedula:']}</td>
                      <td>{ticket['Email']}</td>
                      <td><code>{ticket['Transaction ID']}</code></td>
                      <td><code>{ticket['Ticket ID']}</code></td>
                      <td>
                        {ticket.reconciliadoConCsv ? (
                          <span className="table-tag table-tag-active" title="Ya se completó con la fila real del CSV">Reconciliado</span>
                        ) : (
                          <span className="table-tag table-tag-pending">Solo manual</span>
                        )}
                      </td>
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
