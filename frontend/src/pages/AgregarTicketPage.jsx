import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services';
import api from '../services/api';
import Swal from 'sweetalert2';
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
  const userRole = user?.role || user?.rol;

  const [form, setForm] = useState(FORM_VACIO);
  const [localidades, setLocalidades] = useState([]);
  const [cargandoLocalidades, setCargandoLocalidades] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ultimoCreado, setUltimoCreado] = useState(null);

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

  if (!ROLES_PERMITIDOS.includes(userRole)) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">No tiene permisos para acceder a esta página.</div>
      </div>
    );
  }

  const handleChange = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

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
      const response = await ticketService.crearTicketManual(form);
      if (response.success) {
        setUltimoCreado(response.ticket);
        setForm(FORM_VACIO);
        Swal.fire({
          title: 'Ticket creado',
          html: `Queda registrado como <strong>canjeado</strong>.<br/>Ticket ID: <code>${response.ticket['Ticket ID']}</code>`,
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('Error al crear ticket manual:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo crear el ticket', 'error');
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
                    onChange={(e) => handleChange('cedula', e.target.value.replace(/\D/g, ''))}
                    placeholder="Solo números"
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
    </div>
  );
};

export default AgregarTicketPage;
