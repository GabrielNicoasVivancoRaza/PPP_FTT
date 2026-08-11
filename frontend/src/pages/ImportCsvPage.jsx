import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services';
import Swal from 'sweetalert2';
import 'bootstrap/dist/css/bootstrap.min.css';

const ROLES_PERMITIDOS = ['jefe', 'importador'];

const ImportCsvPage = () => {
  const { user } = useAuth();
  const userRole = user?.role || user?.rol;
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const inputRef = useRef(null);

  if (!ROLES_PERMITIDOS.includes(userRole)) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">No tiene permisos para acceder a esta página.</div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && !file.name.toLowerCase().endsWith('.csv')) {
      Swal.fire('Archivo inválido', 'Debe seleccionar un archivo .csv', 'warning');
      e.target.value = '';
      setArchivo(null);
      return;
    }
    setArchivo(file || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!archivo) {
      Swal.fire('Falta el archivo', 'Seleccione el CSV del evento antes de subir', 'warning');
      return;
    }

    try {
      setSubiendo(true);
      const response = await ticketService.importCsv(archivo);
      if (response.success) {
        setUltimoResultado(response.data);
        setArchivo(null);
        if (inputRef.current) inputRef.current.value = '';

        Swal.fire({
          title: 'Importación completa',
          html: `<strong>${response.data.nuevosAgregados}</strong> ticket(s) nuevo(s) agregado(s)<br/>` +
                `${response.data.yaExistian} ya existían (sin modificar)`,
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('Error al importar CSV:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo importar el archivo', 'error');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h2 className="mb-1">Importar CSV del Evento</h2>
        <p className="text-muted mb-0">
          Sube el CSV tal como llega por correo. Solo se agregan los tickets nuevos (por Ticket ID);
          los que ya existen no se modifican — no se pierde el canje ni la impresión ya registrados.
        </p>
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Archivo CSV</label>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    className="form-control"
                    onChange={handleFileChange}
                    disabled={subiendo}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={subiendo || !archivo}>
                  {subiendo ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Importando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload me-2"></i>Subir e importar
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          {ultimoResultado ? (
            <div className="card">
              <div className="card-header">
                <strong>Resultado de la última importación</strong>
              </div>
              <div className="card-body">
                <ul className="list-unstyled mb-0">
                  <li className="mb-2"><strong>Total en el archivo:</strong> {ultimoResultado.totalEnArchivo}</li>
                  <li className="mb-2">
                    <span className="badge bg-success me-2">{ultimoResultado.nuevosAgregados}</span>
                    tickets nuevos agregados
                  </li>
                  <li className="mb-2">
                    <span className="badge bg-secondary me-2">{ultimoResultado.yaExistian}</span>
                    ya existían (no se tocaron)
                  </li>
                  {ultimoResultado.omitidosPorDatosIncompletos > 0 && (
                    <li className="mb-2">
                      <span className="badge bg-warning text-dark me-2">{ultimoResultado.omitidosPorDatosIncompletos}</span>
                      omitidos por datos incompletos
                    </li>
                  )}
                  {ultimoResultado.erroresInsercion > 0 && (
                    <li className="mb-0">
                      <span className="badge bg-danger me-2">{ultimoResultado.erroresInsercion}</span>
                      con error al insertar
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="alert alert-info mb-0">
              Aquí aparecerá el resumen después de subir un archivo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportCsvPage;
