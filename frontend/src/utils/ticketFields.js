/**
 * Lectura tolerante de campos del ticket que vienen del CSV.
 *
 * El nombre de la columna de cédula varía según cómo se haya importado el
 * archivo: "Número de Cédula:", "Numero de Cedula:", con o sin espacio final,
 * con tilde o sin tilde. En vez de adivinar una variante concreta, se busca
 * la clave normalizada.
 */

const normalizar = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export const getCedula = (ticket) => {
  if (!ticket) return '';
  const clave = Object.keys(ticket).find(k => normalizar(k).includes('cedula'));
  const valor = clave ? String(ticket[clave] || '').trim() : '';
  return valor;
};

export const LAST4_SIN_DATO = 'Cash / Comprado en punto de venta';

/**
 * Devuelve la información de pago (últimos 4 dígitos o email de PayPal).
 * Si el ticket no la trae, se asume compra en efectivo/punto de venta.
 */
export const getLast4 = (ticket) => {
  if (!ticket) return LAST4_SIN_DATO;
  const valor = String(ticket['Last4/PayPal Email'] || '').trim();
  return valor || LAST4_SIN_DATO;
};

/** Nombre completo, tolerando tickets creados a mano (solo "First Name") */
export const getNombreCompleto = (ticket) => {
  if (!ticket) return '';
  return `${ticket['First Name'] || ''} ${ticket['Last Name'] || ''}`.trim();
};
