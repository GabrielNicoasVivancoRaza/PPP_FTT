import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketService, sobresService } from '../services';
import Swal from 'sweetalert2';
import { hasAnyRole } from '../utils/roles';
import 'bootstrap/dist/css/bootstrap.min.css';

const ROLES_PERMITIDOS = ['jefe', 'importador'];

const ImportCsvPage = () => {
  const { user } = useAuth();
  const [archivo, setArchivo] = useState(null);
  const [impresoHasta, setImpresoHasta] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const inputRef = useRef(null);

  // Importar sobres (ubicación física de los boletos impresos, por nombre)
  const [archivoSobres, setArchivoSobres] = useState(null);
  const [subiendoSobres, setSubiendoSobres] = useState(false);
  const [resumenSobres, setResumenSobres] = useState(null);
  const [cargandoResumenSobres, setCargandoResumenSobres] = useState(true);
  const inputSobresRef = useRef(null);

  const cargarResumenSobres = useCallback(async () => {
    try {
      setCargandoResumenSobres(true);
      const response = await sobresService.getResumen();
      if (response.success) {
        setResumenSobres(response.data);
      }
    } catch (error) {
      console.error('Error al obtener resumen de sobres:', error);
    } finally {
      setCargandoResumenSobres(false);
    }
  }, []);

  useEffect(() => {
    cargarResumenSobres();
  }, [cargarResumenSobres]);

  if (!hasAnyRole(user, ROLES_PERMITIDOS)) {
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
      const response = await ticketService.importCsv(archivo, impresoHasta);
      if (response.success) {
        setUltimoResultado(response.data);
        setArchivo(null);
        if (inputRef.current) inputRef.current.value = '';

        const {
          nuevosAgregados, yaExistian, reconciliados = 0, eliminados = 0, eliminadosYaCanjeados = 0,
          cedulasCompletadas = 0, ticketsEncoladosImpresion = 0
        } = response.data;

        let html = `<strong>${nuevosAgregados}</strong> ticket(s) nuevo(s) agregado(s)<br/>` +
                   `${yaExistian} ya existían (sin modificar)`;
        if (reconciliados > 0) {
          html += `<br/><strong>${reconciliados}</strong> ticket(s) agregado(s) manualmente se completaron con el CSV real`;
        }
        if (cedulasCompletadas > 0) {
          html += `<br/><strong>${cedulasCompletadas}</strong> cédula(s) completada(s) automáticamente (misma Transaction ID)`;
        }
        if (ticketsEncoladosImpresion > 0) {
          html += `<br/><strong>${ticketsEncoladosImpresion}</strong> ticket(s) comprados después del corte se encolaron para el impresor`;
        }
        if (eliminados > 0) {
          html += `<br/><span class="text-danger"><strong>${eliminados}</strong> ya no están en el archivo y se marcaron como eliminados</span>`;
          if (eliminadosYaCanjeados > 0) {
            html += `<br/><span class="text-danger"><strong>${eliminadosYaCanjeados}</strong> de ellos YA habían sido canjeados</span>`;
          }
        }

        Swal.fire({
          title: 'Importación completa',
          html,
          icon: eliminadosYaCanjeados > 0 ? 'warning' : 'success'
        });
      }
    } catch (error) {
      console.error('Error al importar CSV:', error);

      // Sin error.response = no llegó respuesta del servidor (se cortó la
      // conexión, timeout, etc.). Con archivos grandes el backend puede
      // seguir procesando y terminar bien aunque el navegador ya haya
      // abandonado la espera, así que NO se debe asumir que no pasó nada.
      if (!error.response) {
        Swal.fire({
          title: 'No se recibió respuesta del servidor',
          html:
            'La importación puede seguir procesándose o haber terminado del lado del servidor, ' +
            'aunque el navegador dejó de esperar.<br/><br/>' +
            '<strong>Antes de volver a subir el archivo</strong>, revisa la lista de tickets o la ' +
            'sección de Auditoría para confirmar si ya se aplicó. Si vuelves a subirlo, no hay ' +
            'problema: los que ya existan no se van a duplicar ni modificar.',
          icon: 'warning'
        });
      } else {
        Swal.fire('Error', error.response?.data?.message || 'No se pudo importar el archivo', 'error');
      }
    } finally {
      setSubiendo(false);
    }
  };

  const handleFileChangeSobres = (e) => {
    const file = e.target.files?.[0];
    if (file && !file.name.toLowerCase().endsWith('.csv')) {
      Swal.fire('Archivo inválido', 'Debe seleccionar un archivo .csv', 'warning');
      e.target.value = '';
      setArchivoSobres(null);
      return;
    }
    setArchivoSobres(file || null);
  };

  const handleSubmitSobres = async (e) => {
    e.preventDefault();
    if (!archivoSobres) {
      Swal.fire('Falta el archivo', 'Seleccione el CSV de sobres antes de subir', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Reemplazar información de sobres?',
      text: 'Esto borra toda la información de sobres cargada anteriormente y la reemplaza por la de este archivo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, reemplazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      reverseButtons: true
    });
    if (!result.isConfirmed) return;

    try {
      setSubiendoSobres(true);
      const response = await sobresService.importar(archivoSobres);
      if (response.success) {
        setArchivoSobres(null);
        if (inputSobresRef.current) inputSobresRef.current.value = '';
        Swal.fire({ title: 'Sobres actualizados', text: response.message, icon: 'success' });
        cargarResumenSobres();
      }
    } catch (error) {
      console.error('Error al importar sobres:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo importar el archivo', 'error');
    } finally {
      setSubiendoSobres(false);
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

                <div className="mb-3">
                  <label className="form-label">Impreso hasta (opcional)</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={impresoHasta}
                    onChange={(e) => setImpresoHasta(e.target.value)}
                    disabled={subiendo}
                  />
                  <small className="form-text text-muted">
                    Hora local de Ecuador hasta la que ya imprimiste físicamente los boletos. Los
                    tickets nuevos comprados después de esa hora quedan marcados como pendientes de
                    imprimir y se encolan automáticamente para el impresor (cola de impresión). Si
                    no aplica, dejalo vacío.
                  </small>
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
                  {ultimoResultado.reconciliados > 0 && (
                    <li className="mb-2">
                      <span className="badge bg-info text-dark me-2">{ultimoResultado.reconciliados}</span>
                      agregados manualmente y completados con el CSV real
                    </li>
                  )}
                  {ultimoResultado.cedulasCompletadas > 0 && (
                    <li className="mb-2">
                      <span className="badge bg-info text-dark me-2">{ultimoResultado.cedulasCompletadas}</span>
                      cédulas completadas automáticamente (misma Transaction ID)
                    </li>
                  )}
                  {ultimoResultado.ticketsEncoladosImpresion > 0 && (
                    <li className="mb-2">
                      <span className="badge bg-warning text-dark me-2">{ultimoResultado.ticketsEncoladosImpresion}</span>
                      comprados después del corte, encolados para el impresor
                    </li>
                  )}
                  {ultimoResultado.omitidosPorDatosIncompletos > 0 && (
                    <li className="mb-2">
                      <span className="badge bg-warning text-dark me-2">{ultimoResultado.omitidosPorDatosIncompletos}</span>
                      omitidos por datos incompletos
                    </li>
                  )}
                  {ultimoResultado.erroresInsercion > 0 && (
                    <li className="mb-2">
                      <span className="badge bg-danger me-2">{ultimoResultado.erroresInsercion}</span>
                      con error al insertar
                    </li>
                  )}
                  {ultimoResultado.eliminados > 0 && (
                    <li className="mb-2">
                      <span className="badge bg-danger me-2">{ultimoResultado.eliminados}</span>
                      eliminados del evento (ya no vienen en el archivo)
                    </li>
                  )}
                  {ultimoResultado.eliminadosYaCanjeados > 0 && (
                    <li className="mb-0">
                      <span className="badge bg-danger me-2">{ultimoResultado.eliminadosYaCanjeados}</span>
                      <strong className="text-danger">eliminados que YA habían sido canjeados</strong>
                    </li>
                  )}
                </ul>
                {ultimoResultado.eliminados > 0 && (
                  <a href="/tickets-eliminados" className="btn btn-outline-danger btn-sm mt-3">
                    Ver tickets eliminados
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="alert alert-info mb-0">
              Aquí aparecerá el resumen después de subir un archivo.
            </div>
          )}
        </div>
      </div>

      {/* Importar sobres: ubicación física de los boletos impresos, ordenados
          por nombre (proceso externo, ajeno a esta app). Se usa al momento
          de canjear para saber en qué sobre buscar el boleto. */}
      <div className="row g-4 mt-1">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <strong>Importar Sobres (ubicación física)</strong>
            </div>
            <div className="card-body">
              <p className="text-muted small">
                CSV con las columnas <code>sobre</code>, <code>numero_boleto</code>,{' '}
                <code>posicion_original</code> y <code>nombre</code>. Cada importación{' '}
                <strong>reemplaza toda</strong> la información anterior — no se mezcla con
                una subida vieja, porque el reordenamiento puede cambiar de una tanda a otra.
                El emparejamiento con los tickets es por nombre, así que no todos los
                tickets van a tener un sobre asignado.
              </p>
              <form onSubmit={handleSubmitSobres}>
                <div className="mb-3">
                  <input
                    ref={inputSobresRef}
                    type="file"
                    accept=".csv"
                    className="form-control"
                    onChange={handleFileChangeSobres}
                    disabled={subiendoSobres}
                  />
                </div>
                <button type="submit" className="btn btn-outline-primary w-100" disabled={subiendoSobres || !archivoSobres}>
                  {subiendoSobres ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Importando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload me-2"></i>Subir y reemplazar
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <strong>Información de sobres cargada</strong>
            </div>
            <div className="card-body">
              {cargandoResumenSobres ? (
                <div className="d-flex justify-content-center py-3">
                  <div className="spinner-border spinner-border-sm" role="status"></div>
                </div>
              ) : !resumenSobres || resumenSobres.totalFilas === 0 ? (
                <div className="alert alert-secondary mb-0">
                  Todavía no se subió ningún archivo de sobres.
                </div>
              ) : (
                <ul className="list-unstyled mb-0">
                  <li className="mb-2">
                    <span className="badge bg-primary me-2">{resumenSobres.totalFilas}</span>
                    fila(s) cargadas
                  </li>
                  <li className="mb-2">
                    <span className="badge bg-primary me-2">{resumenSobres.nombresDistintos}</span>
                    persona(s) distintas
                  </li>
                  {resumenSobres.ultimaImportacion && (
                    <li className="text-muted small">
                      Última importación: {new Date(resumenSobres.ultimaImportacion.fecha).toLocaleString('es-ES')}
                      {resumenSobres.ultimaImportacion.usuario && ` — ${resumenSobres.ultimaImportacion.usuario}`}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportCsvPage;
