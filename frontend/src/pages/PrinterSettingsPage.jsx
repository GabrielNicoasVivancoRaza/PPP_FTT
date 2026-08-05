import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { printerSettingsService } from '../services';
import Swal from 'sweetalert2';
import 'bootstrap/dist/css/bootstrap.min.css';

// Paleta de colores predefinida para asignar a cada tipo de ticket
const PALETA = [
  { nombre: 'Negro', valor: '#111827' },
  { nombre: 'Amarillo', valor: '#f59e0b' },
  { nombre: 'Rojo', valor: '#dc2626' },
  { nombre: 'Azul', valor: '#2563eb' },
  { nombre: 'Verde', valor: '#16a34a' },
  { nombre: 'Morado', valor: '#7c3aed' },
  { nombre: 'Naranja', valor: '#ea580c' },
  { nombre: 'Rosado', valor: '#db2777' }
];

const PrinterSettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [tipos, setTipos] = useState([]);
  const [colores, setColores] = useState({}); // { tipo: colorHex }

  useEffect(() => {
    if (user?.rol === 'jefe') {
      cargarDatos();
    }
  }, [user]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [settingsRes, tiposRes] = await Promise.all([
        printerSettingsService.getSettings(),
        printerSettingsService.getTicketTypes()
      ]);

      if (settingsRes.success) {
        setEnabled(settingsRes.data.enabled);
        const mapaColores = {};
        (settingsRes.data.ticketColors || []).forEach(tc => {
          mapaColores[tc.tipo] = tc.color;
        });
        setColores(mapaColores);
      }

      if (tiposRes.success) {
        setTipos(tiposRes.data.tipos || []);
      }
    } catch (error) {
      console.error('Error al cargar configuración de impresión:', error);
      Swal.fire('Error', 'No se pudo cargar la configuración de impresión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async () => {
    const nuevoValor = !enabled;
    try {
      setSaving(true);
      const response = await printerSettingsService.updateEnabled(nuevoValor);
      if (response.success) {
        setEnabled(nuevoValor);
        Swal.fire({
          title: nuevoValor ? 'Impresión habilitada' : 'Impresión deshabilitada',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error al actualizar estado de impresión:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo actualizar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = (tipo, color) => {
    setColores(prev => ({ ...prev, [tipo]: color }));
  };

  const handleGuardarColores = async () => {
    try {
      setSaving(true);
      const ticketColors = tipos
        .filter(tipo => colores[tipo])
        .map(tipo => ({ tipo, color: colores[tipo] }));

      const response = await printerSettingsService.updateColors(ticketColors);
      if (response.success) {
        Swal.fire({
          title: 'Colores guardados',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error al guardar colores:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudieron guardar los colores', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (user?.rol !== 'jefe') {
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

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">Configuración de Impresión</h2>

          <div className="card mb-4">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-1">¿Hay impresores en este evento?</h5>
                <p className="text-muted mb-0">
                  Al habilitar esta opción, las cuentas con rol <strong>Impresor</strong> (canje directo) e{' '}
                  <strong>Impresor (Cola)</strong> podrán operar. Si está deshabilitado, el canje funciona
                  como hoy, sin control de impresión.
                </p>
              </div>
              <div className="form-check form-switch fs-4 ms-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={enabled}
                  disabled={saving}
                  onChange={handleToggleEnabled}
                  style={{ width: '3rem', height: '1.6rem', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Colores por tipo de ticket</h5>
              <button className="btn btn-outline-secondary btn-sm" onClick={cargarDatos} disabled={loading}>
                <i className="fas fa-sync-alt me-1"></i>Actualizar tipos
              </button>
            </div>
            <div className="card-body">
              {tipos.length === 0 ? (
                <div className="alert alert-info mb-0">
                  No se detectaron tipos de ticket en los datos importados todavía.
                </div>
              ) : (
                <>
                  <p className="text-muted">
                    Asigne un color a cada tipo de ticket (campo &quot;Ticket&quot; del CSV). Este color se usará para
                    agrupar las solicitudes en la cola de impresión.
                  </p>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead>
                        <tr>
                          <th>Tipo de ticket</th>
                          <th>Color asignado</th>
                          <th>Vista previa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tipos.map(tipo => (
                          <tr key={tipo}>
                            <td className="fw-semibold">{tipo}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <select
                                  className="form-select form-select-sm"
                                  style={{ maxWidth: 200 }}
                                  value={PALETA.some(p => p.valor === colores[tipo]) ? colores[tipo] : 'custom'}
                                  onChange={(e) => {
                                    if (e.target.value !== 'custom') {
                                      handleColorChange(tipo, e.target.value);
                                    }
                                  }}
                                >
                                  <option value="custom" disabled hidden={colores[tipo] && !PALETA.some(p => p.valor === colores[tipo])}>
                                    Seleccione un color
                                  </option>
                                  {PALETA.map(p => (
                                    <option key={p.valor} value={p.valor}>{p.nombre}</option>
                                  ))}
                                </select>
                                <input
                                  type="color"
                                  className="form-control form-control-color"
                                  value={colores[tipo] || '#cccccc'}
                                  onChange={(e) => handleColorChange(tipo, e.target.value)}
                                  title="Color personalizado"
                                />
                              </div>
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: colores[tipo] || '#e5e7eb',
                                  color: '#fff',
                                  minWidth: 90,
                                  display: 'inline-block'
                                }}
                              >
                                {tipo}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="d-flex justify-content-end">
                    <button className="btn btn-primary" onClick={handleGuardarColores} disabled={saving}>
                      {saving ? 'Guardando...' : 'Guardar colores'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterSettingsPage;
