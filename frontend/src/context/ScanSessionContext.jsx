import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import Swal from 'sweetalert2';
import { hasRole } from '../utils/roles';

/**
 * Sesión de escaneo con el celular.
 *
 * Vive a nivel de app (no dentro de la página del escáner) por dos motivos:
 *  1. El código de sesión se guarda en localStorage, así el celular queda
 *     vinculado de forma permanente: se escanea el QR de emparejamiento UNA
 *     sola vez, no una vez por boleto.
 *  2. El listener de escaneos es global, así que aunque la computadora esté
 *     en /tickets terminando un canje, el siguiente código que mande el
 *     celular se procesa igual, sin volver a pasar por /escanearTicket.
 */

const STORAGE_KEY = 'ftt_scan_session';

const ScanSessionContext = createContext();

const generarCodigoSesion = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export const limpiarSesionEscaneo = () => localStorage.removeItem(STORAGE_KEY);

export const ScanSessionProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [sessionCode, setSessionCode] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const procesandoRef = useRef(false);

  const esJefe = hasRole(user, 'jefe');
  const esImpresorCola = hasRole(user, 'impresor_cola');

  const iniciarSesion = useCallback(() => {
    const existente = localStorage.getItem(STORAGE_KEY);
    if (existente) {
      setSessionCode(existente);
      return existente;
    }
    const codigo = generarCodigoSesion();
    localStorage.setItem(STORAGE_KEY, codigo);
    setSessionCode(codigo);
    return codigo;
  }, []);

  const terminarSesion = useCallback(() => {
    limpiarSesionEscaneo();
    setSessionCode(null);
  }, []);

  const regenerarSesion = useCallback(() => {
    const codigo = generarCodigoSesion();
    localStorage.setItem(STORAGE_KEY, codigo);
    setSessionCode(codigo);
    return codigo;
  }, []);

  // Notificación al administrador cuando una importación detecta tickets
  // que ya no están en el CSV del evento (anulados/reembolsados).
  useEffect(() => {
    if (!isAuthenticated || !esJefe) return;

    socketService.connect(token);

    const onEliminados = (data) => {
      const yaCanjeados = data?.eliminadosYaCanjeados || 0;
      Swal.fire({
        title: 'Tickets eliminados del evento',
        html:
          `Se detectaron <strong>${data?.eliminados || 0}</strong> ticket(s) que ya no vienen en el archivo` +
          (yaCanjeados > 0
            ? `<br/><span style="color:#dc3545"><strong>${yaCanjeados}</strong> de ellos YA habían sido canjeados</span>`
            : ''),
        icon: yaCanjeados > 0 ? 'warning' : 'info',
        confirmButtonText: 'Ver detalle',
        showCancelButton: true,
        cancelButtonText: 'Cerrar'
      }).then(result => {
        if (result.isConfirmed) navigate('/tickets-eliminados');
      });
    };

    socketService.on('tickets-eliminados-detectados', onEliminados);
    return () => socketService.off('tickets-eliminados-detectados', onEliminados);
  }, [isAuthenticated, esJefe, token, navigate]);

  useEffect(() => {
    if (!sessionCode || !isAuthenticated) return;

    socketService.connect(token);
    socketService.joinScanSession(sessionCode);

    const onScanDetected = async (data) => {
      // Evita procesar dos códigos a la vez si llegan muy seguidos
      if (!data?.code || procesandoRef.current) return;
      procesandoRef.current = true;

      try {
        const response = await api.get(`/tickets/barcode/${encodeURIComponent(data.code)}`);
        if (response.data.success) {
          const { ticket, transactionCount } = response.data;

          if (esImpresorCola) {
            // impresor_cola no canjea: se muestra la info en la propia página del escáner
            navigate('/escanearTicket', {
              state: { scannedResult: { ticket, transactionCount }, scannedAt: Date.now() }
            });
          } else {
            navigate('/tickets', { state: { scannedTicket: ticket, scannedAt: Date.now() } });
          }
        }
      } catch (error) {
        if (error.response?.status === 404) {
          Swal.fire({
            title: 'No encontrado',
            text: 'Ningún ticket tiene ese código',
            icon: 'warning',
            timer: 2200,
            showConfirmButton: false
          });
        } else {
          console.error('Error al buscar el ticket escaneado:', error);
          Swal.fire('Error', 'No se pudo buscar el ticket', 'error');
        }
      } finally {
        procesandoRef.current = false;
      }
    };

    socketService.on('scan-detected', onScanDetected);
    return () => socketService.off('scan-detected', onScanDetected);
  }, [sessionCode, isAuthenticated, token, esImpresorCola, navigate]);

  const valor = {
    sessionCode,
    activa: !!sessionCode,
    iniciarSesion,
    terminarSesion,
    regenerarSesion
  };

  return (
    <ScanSessionContext.Provider value={valor}>
      {children}
    </ScanSessionContext.Provider>
  );
};

export const useScanSession = () => {
  const context = useContext(ScanSessionContext);
  if (!context) {
    throw new Error('useScanSession debe usarse dentro de ScanSessionProvider');
  }
  return context;
};
