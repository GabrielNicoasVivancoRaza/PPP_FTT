import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useScanSession } from '../context/ScanSessionContext';
import { SCAN_FRAME_STYLES, ScanFrame } from './ScanFrame';

/**
 * Paso de validación del/los boleto(s) físico(s) antes de confirmar un
 * canje: exige escanear el código de barras/QR de CADA ticket que se va a
 * entregar (el principal + los que se marcaron para completar con la misma
 * información, misma transacción) y los compara contra codigosEsperados.
 * No deja avanzar hasta escanear todos, o hasta que se cancele.
 *
 * modo: 'computadora' (usa la cámara de este dispositivo) o 'celular' (usa
 * el que ya está vinculado vía ScanSessionContext — no hace falta volver a
 * emparejarlo, el código que mande se intercepta antes del flujo normal de
 * búsqueda de ticket).
 */
const ValidacionEscaneoModal = ({ show, modo, codigosEsperados = [], onConfirmado, onCancelado }) => {
  const { esperarProximoEscaneo, cancelarEsperaEscaneo } = useScanSession();
  const [error, setError] = useState('');
  const [escaneados, setEscaneados] = useState([]);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const activoRef = useRef(false);
  // Fuente de verdad para la comparación dentro del efecto (evita que el
  // closure de procesarCodigo quede con el valor viejo de "escaneados";
  // "escaneados" en sí solo se usa para pintar el contador en pantalla)
  const escaneadosRef = useRef([]);

  useEffect(() => {
    if (!show) return;
    activoRef.current = true;
    escaneadosRef.current = [];
    setEscaneados([]);
    setError('');

    const procesarCodigo = (codigo) => {
      if (!activoRef.current) return;

      if (escaneadosRef.current.includes(codigo)) {
        setError('Ya escaneaste ese boleto. Falta(n) escanear el/los otro(s).');
        return;
      }
      if (!codigosEsperados.includes(codigo)) {
        setError('Este código no corresponde a ninguno de los boletos de esta entrega.');
        return;
      }

      setError('');
      const nuevos = [...escaneadosRef.current, codigo];
      escaneadosRef.current = nuevos;
      setEscaneados(nuevos);

      if (nuevos.length >= codigosEsperados.length) {
        onConfirmado(nuevos);
      }
    };

    if (modo === 'celular') {
      // Bucle: espera un código, lo valida, y si no coincide (o ya se
      // había escaneado) vuelve a esperar el siguiente — hasta completar
      // todos o cancelar
      const esperarCiclo = async () => {
        while (activoRef.current) {
          const codigo = await esperarProximoEscaneo();
          if (!activoRef.current) return;
          if (codigo === null) return; // cancelado desde afuera
          procesarCodigo(codigo);
        }
      };
      esperarCiclo();
      return () => {
        activoRef.current = false;
        cancelarEsperaEscaneo();
      };
    }

    // modo 'computadora': cámara local con ZXing
    const codeReader = new BrowserMultiFormatReader();
    codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (!result || !activoRef.current) return;
      procesarCodigo(result.getText());
    }).then(controls => {
      controlsRef.current = controls;
    }).catch(err => {
      console.error('Error al acceder a la cámara:', err);
      setError('No se pudo acceder a la cámara. Revisá los permisos del navegador.');
    });

    return () => {
      activoRef.current = false;
      try { controlsRef.current?.stop(); } catch { /* noop */ }
      controlsRef.current = null;
    };
  }, [show, modo, codigosEsperados, esperarProximoEscaneo, cancelarEsperaEscaneo, onConfirmado]);

  if (!show) return null;

  const total = codigosEsperados.length;
  const hechos = escaneados.length;
  const faltan = Math.max(total - hechos, 0);

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
      <style>{SCAN_FRAME_STYLES}</style>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {total > 1 ? 'Validar boletos físicos' : 'Validar boleto físico'}
            </h5>
          </div>
          <div className="modal-body text-center">
            {total > 1 && (
              <div className="mb-3">
                <span className="badge bg-primary fs-6">
                  Escaneados: {hechos} de {total}
                </span>
                <p className="text-muted small mb-0 mt-1">
                  Son {total} boletos en esta entrega — faltan {faltan}.
                </p>
              </div>
            )}
            {modo === 'celular' ? (
              <>
                <i className="fas fa-mobile-alt fa-3x text-success mb-3"></i>
                <p>
                  Escaneá con el celular vinculado el código de{' '}
                  {total > 1 ? 'cada boleto que estás entregando' : 'boleto que estás entregando'}.
                </p>
                <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                Esperando escaneo...
              </>
            ) : (
              <>
                <p className="text-muted mb-2">
                  Apuntá la cámara al código de{' '}
                  {total > 1 ? 'cada boleto que estás entregando' : 'boleto que estás entregando'}.
                </p>
                <div className="scan-frame-wrap mx-auto" style={{ maxWidth: 360 }}>
                  <video ref={videoRef} style={{ width: '100%', display: 'block', backgroundColor: '#000' }} muted playsInline />
                  <ScanFrame />
                </div>
              </>
            )}
            {error && (
              <div className="alert alert-danger mt-3 mb-0">
                <i className="fas fa-triangle-exclamation me-2"></i>{error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancelado}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidacionEscaneoModal;
