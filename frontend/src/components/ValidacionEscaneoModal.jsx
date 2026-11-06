import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useScanSession } from '../context/ScanSessionContext';
import { SCAN_FRAME_STYLES, ScanFrame } from './ScanFrame';

/**
 * Paso de validación del boleto físico antes de confirmar un canje: exige
 * escanear el código de barras/QR del ticket que se está entregando y lo
 * compara contra el ticket que se está canjeando (codigoEsperado). No deja
 * avanzar hasta que coincida, o hasta que se cancele.
 *
 * modo: 'computadora' (usa la cámara de este dispositivo) o 'celular' (usa
 * el que ya está vinculado vía ScanSessionContext — no hace falta volver a
 * emparejarlo, el código que mande se intercepta antes del flujo normal de
 * búsqueda de ticket).
 */
const ValidacionEscaneoModal = ({ show, modo, codigoEsperado, onConfirmado, onCancelado }) => {
  const { esperarProximoEscaneo, cancelarEsperaEscaneo } = useScanSession();
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const activoRef = useRef(false);

  useEffect(() => {
    if (!show) return;
    activoRef.current = true;
    setError('');

    const procesarCodigo = (codigo) => {
      if (!activoRef.current) return;
      if (codigo === codigoEsperado) {
        onConfirmado(codigo);
      } else {
        setError('Este código no corresponde a este boleto. Verificá que sea el correcto e intentá de nuevo.');
      }
    };

    if (modo === 'celular') {
      // Bucle: espera un código, lo valida, y si no coincide vuelve a
      // esperar el siguiente — hasta que coincida o se cancele
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
  }, [show, modo, codigoEsperado, esperarProximoEscaneo, cancelarEsperaEscaneo, onConfirmado]);

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
      <style>{SCAN_FRAME_STYLES}</style>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Validar boleto físico</h5>
          </div>
          <div className="modal-body text-center">
            {modo === 'celular' ? (
              <>
                <i className="fas fa-mobile-alt fa-3x text-success mb-3"></i>
                <p>Escaneá con el celular vinculado el código del boleto que estás entregando.</p>
                <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                Esperando escaneo...
              </>
            ) : (
              <>
                <p className="text-muted mb-2">Apuntá la cámara al código del boleto que estás entregando.</p>
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
