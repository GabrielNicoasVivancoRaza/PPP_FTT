import React from 'react';

// Estilos del cuadro de apuntado (viewfinder) que se superpone al video de
// la cámara para indicar dónde centrar el código QR. Compartido entre
// ScanTicketPage y la validación de boleto físico al canjear.
export const SCAN_FRAME_STYLES = `
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
export const ScanFrame = () => (
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
