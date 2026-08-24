import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useScanSession } from '../context/ScanSessionContext';
import api from '../services/api';
import socketService from '../services/socket';
import { BrowserMultiFormatReader } from '@zxing/browser';
import QRCode from 'qrcode';
import Swal from 'sweetalert2';
import { hasRole, hasAnyRole } from '../utils/roles';
import 'bootstrap/dist/css/bootstrap.min.css';

const ROLES_PERMITIDOS = ['jefe', 'staff', 'impresor_solo', 'impresor_cola'];
const CODE_COOLDOWN_MS = 3000; // evita reprocesar el mismo código repetidamente

// Estilos del cuadro de apuntado (viewfinder) que se superpone al video de
// la cámara para indicar dónde centrar el código QR
const SCAN_FRAME_STYLES = `
  .scan-frame-wrap { position: relative; overflow: hidden; border-radius: 8px; line-height: 0; }
  .scan-frame-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .scan-frame-box {
    position: relative;
    width: 62%;
    max-width: 260px;
    aspect-ratio: 1 / 1;
    border-radius: 12px;
    box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.45);
  }
  .scan-frame-corner {
    position: absolute;
    width: 28px;
    height: 28px;
    border: 4px solid #22c55e;
  }
  .scan-frame-corner.tl { top: -2px; left: -2px; border-right: none; border-bottom: none; border-top-left-radius: 10px; }
  .scan-frame-corner.tr { top: -2px; right: -2px; border-left: none; border-bottom: none; border-top-right-radius: 10px; }
  .scan-frame-corner.bl { bottom: -2px; left: -2px; border-right: none; border-top: none; border-bottom-left-radius: 10px; }
  .scan-frame-corner.br { bottom: -2px; right: -2px; border-left: none; border-top: none; border-bottom-right-radius: 10px; }
  .scan-frame-line {
    position: absolute;
    left: 6%;
    right: 6%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #22c55e, transparent);
    animation: scan-frame-line-move 2.2s ease-in-out infinite;
  }
  @keyframes scan-frame-line-move {
    0% { top: 6%; }
    50% { top: 94%; }
    100% { top: 6%; }
  }
`;

// Cuadro de apuntado superpuesto al <video> para guiar dónde centrar el QR
const ScanFrame = () => (
  <div className="scan-frame-overlay">
    <div className="scan-frame-box">
      <span className="scan-frame-corner tl"></span>
      <span className="scan-frame-corner tr"></span>
      <span className="scan-frame-corner bl"></span>
      <span className="scan-frame-corner br"></span>
      <span className="scan-frame-line"></span>
    </div>
  </div>
);

const ScanTicketPage = () => {
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sesionUrl = searchParams.get('sesion');
  const esModoCelular = !!sesionUrl;
  // impresor_cola es el único rol con un comportamiento especial acá (no
  // canjea, solo muestra info); si además tiene otro rol, igual cuenta.
  const esImpresorCola = hasRole(user, 'impresor_cola');

  // La sesión de emparejamiento vive en el contexto (persiste entre páginas
  // y recargas), así el celular se vincula UNA sola vez y sirve para todos
  // los boletos siguientes. En modo celular el código viene por la URL.
  const { sessionCode: sessionCodeCtx, activa, iniciarSesion, terminarSesion, regenerarSesion } = useScanSession();
  const sessionCode = sesionUrl || sessionCodeCtx;

  // pantalla: 'elegir' | 'camara-local' | 'camara-remota' | 'celular'
  const [pantalla, setPantalla] = useState(() => {
    if (esModoCelular) return 'celular';
    // Si el celular ya está vinculado, entrar directo a la pantalla de la sesión
    return localStorage.getItem('ftt_scan_session') ? 'camara-remota' : 'elegir';
  });
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ticket, transactionCount } - vista para impresor_cola
  const [enviados, setEnviados] = useState(0); // # de códigos reenviados desde el celular
  const [errorCamara, setErrorCamara] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const controlsRef = useRef(null);
  const lastCodeRef = useRef({ code: null, time: 0 });

  const stopScanning = useCallback(() => {
    try { controlsRef.current?.stop(); } catch { /* noop */ }
    controlsRef.current = null;
  }, []);

  useEffect(() => stopScanning, [stopScanning]);

  const esCodigoRepetido = (text) => {
    const ahora = Date.now();
    if (lastCodeRef.current.code === text && ahora - lastCodeRef.current.time < CODE_COOLDOWN_MS) {
      return true;
    }
    lastCodeRef.current = { code: text, time: ahora };
    return false;
  };

  // --- Búsqueda del ticket por código y manejo según rol ---
  const buscarTicket = useCallback(async (barcode) => {
    setBuscando(true);
    try {
      const response = await api.get(`/tickets/barcode/${encodeURIComponent(barcode)}`);
      if (response.data.success) {
        const { ticket, transactionCount } = response.data;

        if (esImpresorCola) {
          // impresor_cola no canjea: solo mostramos la info, seguimos escaneando
          setResultado({ ticket, transactionCount });
        } else {
          // jefe / staff / impresor_solo: ir a Tickets y abrir el modal correspondiente
          stopScanning();
          navigate('/tickets', { state: { scannedTicket: ticket, scannedAt: Date.now() } });
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        Swal.fire({ title: 'No encontrado', text: 'Ningún ticket tiene ese código', icon: 'warning', timer: 2200, showConfirmButton: false });
      } else {
        Swal.fire('Error', 'No se pudo buscar el ticket', 'error');
      }
    } finally {
      setBuscando(false);
    }
  }, [esImpresorCola, navigate, stopScanning]);

  // --- Cámara local: usada tanto por la computadora (modo directo) como por el celular (modo remoto) ---
  const iniciarCamara = useCallback((onCodigoDetectado) => {
    setErrorCamara('');
    const codeReader = new BrowserMultiFormatReader();
    codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (!result) return;
      const text = result.getText();
      if (esCodigoRepetido(text)) return;
      onCodigoDetectado(text);
    }).then(controls => {
      controlsRef.current = controls;
    }).catch(err => {
      console.error('Error al acceder a la cámara:', err);
      setErrorCamara('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
    });
  }, []);

  const iniciarCamaraLocal = () => {
    setPantalla('camara-local');
    setTimeout(() => iniciarCamara((text) => buscarTicket(text)), 150);
  };

  const iniciarCamaraCelular = useCallback(() => {
    setTimeout(() => {
      iniciarCamara((text) => {
        socketService.emitScanDetected(sessionCode, text);
        setEnviados(n => n + 1);
      });
    }, 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode]);

  // --- Modo "camara-remota": la compu muestra el QR de emparejamiento ---
  // Ya NO escucha los escaneos acá: de eso se encarga ScanSessionContext a
  // nivel de app, para que la sesión siga viva aunque naveguemos a /tickets.
  useEffect(() => {
    if (pantalla !== 'camara-remota' || esModoCelular) return;

    const codigo = sessionCodeCtx || iniciarSesion();
    const url = `${window.location.origin}/escanearTicket?sesion=${codigo}`;

    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 220, margin: 1 }, (err) => {
        if (err) console.error('Error generando QR:', err);
      });
    }
  }, [pantalla, esModoCelular, sessionCodeCtx, iniciarSesion]);

  // Resultado de un escaneo recibido mientras el rol es impresor_cola
  useEffect(() => {
    if (location.state?.scannedResult) {
      setResultado(location.state.scannedResult);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // --- Modo "celular": esta pestaña ES la cámara remota ---
  useEffect(() => {
    if (pantalla !== 'celular') return;
    socketService.connect(token);
    socketService.joinScanSession(sessionCode);
    iniciarCamaraCelular();
  }, [pantalla, sessionCode, token, iniciarCamaraCelular]);

  const volverAElegir = () => {
    stopScanning();
    setErrorCamara('');
    setResultado(null);
    setPantalla('elegir');
  };

  const handleTerminarSesion = () => {
    terminarSesion();
    setPantalla('elegir');
    Swal.fire({
      title: 'Sesión terminada',
      text: 'El celular quedó desvinculado. Para volver a usarlo hay que emparejarlo de nuevo.',
      icon: 'info',
      timer: 2200,
      showConfirmButton: false
    });
  };

  const handleRegenerarSesion = () => {
    const codigo = regenerarSesion();
    const url = `${window.location.origin}/escanearTicket?sesion=${codigo}`;
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 220, margin: 1 }, (err) => {
        if (err) console.error('Error generando QR:', err);
      });
    }
    Swal.fire({
      title: 'Código nuevo generado',
      text: 'El celular anterior quedó desvinculado: hay que escanear el QR nuevo.',
      icon: 'info',
      timer: 2500,
      showConfirmButton: false
    });
  };

  // --- Modo celular: pantalla pública, sin necesidad de sesión iniciada ---
  if (esModoCelular) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: 480, margin: '0 auto' }}>
        <style>{SCAN_FRAME_STYLES}</style>
        <div className="text-center mb-3">
          <h4>Escáner remoto</h4>
          <p className="text-muted">Apunta la cámara al código del boleto. Se enviará automáticamente a la computadora.</p>
        </div>
        {errorCamara ? (
          <div className="alert alert-danger">{errorCamara}</div>
        ) : (
          <>
            <div className="scan-frame-wrap">
              <video ref={videoRef} style={{ width: '100%', display: 'block', backgroundColor: '#000' }} muted playsInline />
              <ScanFrame />
            </div>
            <div className="text-center mt-3">
              <span className="badge bg-success fs-6">{enviados} código(s) enviado(s)</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // --- Modo computadora: requiere sesión iniciada y rol autorizado ---
  if (authLoading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <div className="spinner-border" role="status"><span className="visually-hidden">Cargando...</span></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyRole(user, ROLES_PERMITIDOS)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h2 className="mb-1">Escanear Ticket</h2>
        <p className="text-muted mb-0">Busca un ticket leyendo su código de barras/QR en vez de buscarlo manualmente.</p>
      </div>

      {pantalla === 'elegir' && (
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body text-center d-flex flex-column">
                <i className="fas fa-camera fa-2x mb-3 text-primary"></i>
                <h5>Usar cámara de esta computadora</h5>
                <p className="text-muted flex-grow-1">Si esta computadora tiene webcam, escanea directo desde aquí.</p>
                <button className="btn btn-primary" onClick={iniciarCamaraLocal}>Iniciar cámara</button>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body text-center d-flex flex-column">
                <i className="fas fa-mobile-alt fa-2x mb-3 text-success"></i>
                <h5>Usar mi celular como escáner</h5>
                <p className="text-muted flex-grow-1">
                  {activa
                    ? 'Ya tienes un celular vinculado: puedes seguir escaneando boletos sin volver a emparejarlo.'
                    : 'Se empareja una sola vez y queda listo para escanear todos los boletos que necesites.'}
                </p>
                <button className="btn btn-success" onClick={() => setPantalla('camara-remota')}>
                  {activa ? 'Ver sesión activa' : 'Emparejar celular'}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {pantalla === 'camara-local' && (
        <div className="card">
          <div className="card-body text-center">
            <button className="btn btn-outline-secondary btn-sm mb-3" onClick={volverAElegir}>
              <i className="fas fa-arrow-left me-1"></i>Volver
            </button>
            {errorCamara ? (
              <div className="alert alert-danger">{errorCamara}</div>
            ) : (
              <>
                <style>{SCAN_FRAME_STYLES}</style>
                <div className="scan-frame-wrap mx-auto" style={{ maxWidth: 480 }}>
                  <video ref={videoRef} style={{ width: '100%', display: 'block', backgroundColor: '#000' }} muted playsInline />
                  <ScanFrame />
                </div>
                <p className="text-muted mt-3">{buscando ? 'Buscando ticket...' : 'Apunta la cámara al código del boleto'}</p>
              </>
            )}
          </div>
        </div>
      )}

      {pantalla === 'camara-remota' && (
        <div className="card">
          <div className="card-body text-center">
            <button className="btn btn-outline-secondary btn-sm mb-3" onClick={volverAElegir}>
              <i className="fas fa-arrow-left me-1"></i>Volver
            </button>

            <div className="alert alert-success d-inline-block px-4">
              <i className="fas fa-link me-2"></i>
              <strong>Sesión activa</strong> — el celular queda vinculado hasta que la termines.
              Escanea este QR <strong>una sola vez</strong> y después solo apunta al boleto de cada persona.
            </div>

            <h5>Escanea este código con tu celular</h5>
            <p className="text-muted mb-2">Ábrelo con la cámara normal de tu celular (no hace falta iniciar sesión ahí).</p>
            <canvas ref={canvasRef}></canvas>

            <div className="mt-3">
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Esperando escaneos del celular... (puedes seguir trabajando en otras pantallas)
            </div>

            <div className="mt-3 d-flex justify-content-center gap-2">
              <button className="btn btn-outline-danger btn-sm" onClick={handleTerminarSesion}>
                <i className="fas fa-unlink me-1"></i>Terminar sesión del celular
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={handleRegenerarSesion}>
                <i className="fas fa-rotate me-1"></i>Generar código nuevo
              </button>
            </div>
            {sessionCode && (
              <div className="mt-2">
                <small className="text-muted">Código de sesión: <code>{sessionCode}</code></small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vista de resultado para impresor_cola: no canjea, solo consulta */}
      {resultado && esImpresorCola && (
        <div className="card mt-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Resultado del último escaneo</strong>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setResultado(null)}>Cerrar</button>
          </div>
          <div className="card-body">
            <p className="mb-1"><strong>Nombre:</strong> {resultado.ticket['First Name']} {resultado.ticket['Last Name']}</p>
            <p className="mb-1"><strong>Asiento:</strong> {resultado.ticket['Seat']}</p>
            <p className="mb-1"><strong>Categoría:</strong> {resultado.ticket['Ticket']}</p>
            <p className="mb-1"><strong>Ticket ID:</strong> {resultado.ticket['Ticket ID']}</p>
            <p className="mb-1"><strong>Transaction ID:</strong> {resultado.ticket['Transaction ID']} ({resultado.transactionCount} ticket(s) asociados)</p>
            <p className="mb-1">
              <strong>Canjeado:</strong>{' '}
              {resultado.ticket.canjeado
                ? <span className="badge bg-success">Sí</span>
                : <span className="badge bg-secondary">No</span>}
            </p>
            <p className="mb-0">
              <strong>Impreso:</strong>{' '}
              {resultado.ticket.impreso
                ? <span className="badge bg-success">Sí</span>
                : <span className="badge bg-warning text-dark">No</span>}
            </p>
            {resultado.ticket.canjeado && !resultado.ticket.impreso && (
              <button className="btn btn-sm btn-dark mt-3" onClick={() => navigate('/cola-impresion')}>
                Ir a la Cola de Impresión
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanTicketPage;
