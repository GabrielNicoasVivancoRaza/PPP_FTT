// Resolución del logo desde la carpeta del frontend (no requiere /public)
// Coloca FTT.png en: frontend/FTT.png
// Esto genera una URL válida para usar en <img> y también para favicon
export const FTT_LOGO = new URL('../../FTT.png', import.meta.url).href;
