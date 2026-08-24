import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services';
import Swal from 'sweetalert2';
import { hasRole } from '../utils/roles';
import 'bootstrap/dist/css/bootstrap.min.css';

const hoyISO = () => new Date().toISOString().slice(0, 10);

const TablaLocalidades = ({ filas, tituloColumnaPorcentaje }) => {
  if (filas.length === 0) {
    return <div className="alert alert-secondary mb-0">No hay tickets registrados todavía.</div>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-dark">
          <tr>
            <th>Localidad</th>
            <th className="text-end">Canjeados</th>
            <th className="text-end">Total localidad</th>
            <th className="text-end">{tituloColumnaPorcentaje}</th>
            <th className="text-end">% de la localidad</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(fila => (
            <tr key={fila.localidad}>
              <td><strong>{fila.localidad}</strong></td>
              <td className="text-end">{fila.canjeados}</td>
              <td className="text-end">{fila.totalLocalidad}</td>
              <td className="text-end">{fila.porcentajeDelTotalCanjeado}%</td>
              <td className="text-end">
                <div className="d-flex align-items-center justify-content-end gap-2">
                  <div className="progress" style={{ width: 80, height: 6 }}>
                    <div
                      className="progress-bar"
                      style={{ width: `${Math.min(fila.porcentajeDeLocalidad, 100)}%` }}
                    ></div>
                  </div>
                  {fila.porcentajeDeLocalidad}%
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const InformeDiarioPage = () => {
  const { user } = useAuth();

  const [fecha, setFecha] = useState(hoyISO());
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState(false);

  const fetchReporte = useCallback(async (fechaConsulta) => {
    try {
      setLoading(true);
      const response = await ticketService.getReporteDiario(fechaConsulta);
      if (response.success) {
        setReporte(response.data);
      }
    } catch (error) {
      console.error('Error al obtener el informe diario:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo obtener el informe', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReporte(fecha);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  const handleDescargarCsv = async () => {
    try {
      setDescargando(true);
      const blob = await ticketService.exportTicketsCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets_${hoyISO()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar CSV de tickets:', error);
      Swal.fire('Error', 'No se pudo descargar el archivo', 'error');
    } finally {
      setDescargando(false);
    }
  };

  if (!hasRole(user, 'jefe')) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">No tiene permisos para acceder a esta página.</div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h2 className="mb-1">Informe Diario</h2>
          <p className="text-muted mb-0">
            Tickets canjeados por localidad, del día seleccionado y acumulado desde el inicio del evento.
          </p>
        </div>
        <div className="d-flex align-items-end gap-2">
          <div>
            <label className="form-label small text-muted mb-1">Día a consultar</label>
            <input
              type="date"
              className="form-control"
              value={fecha}
              max={hoyISO()}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handleDescargarCsv}
            disabled={descargando}
            title="Descargar CSV con todos los tickets de la base de datos (canjeados o no)"
          >
            {descargando ? (
              <span className="spinner-border spinner-border-sm"></span>
            ) : (
              <><i className="fas fa-file-csv me-2"></i>Descargar CSV</>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : !reporte ? (
        <div className="alert alert-secondary">No se pudo cargar el informe.</div>
      ) : (
        <>
          {/* Del día */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong><i className="fas fa-calendar-day me-2"></i>Del día {reporte.fecha}</strong>
              <span className="badge bg-primary fs-6">{reporte.dia.totalCanjeados} canjeados ese día</span>
            </div>
            <div className="card-body p-0">
              <TablaLocalidades
                filas={reporte.dia.porLocalidad}
                tituloColumnaPorcentaje="% de lo canjeado ese día"
              />
            </div>
          </div>

          {/* Total acumulado */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong><i className="fas fa-chart-pie me-2"></i>Total acumulado (desde el inicio)</strong>
              <span className="badge bg-success fs-6">{reporte.total.totalCanjeados} canjeados en total</span>
            </div>
            <div className="card-body p-0">
              <TablaLocalidades
                filas={reporte.total.porLocalidad}
                tituloColumnaPorcentaje="% del total canjeado"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InformeDiarioPage;
