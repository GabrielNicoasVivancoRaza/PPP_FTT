// Arma las filas y el CSV de la exportación de TODOS los tickets (botón
// "Descargar CSV" del jefe, y también lo usa el script de respaldo en
// Python como referencia de columnas). Reutiliza el mismo criterio
// tolerante a variantes de columna que usa el frontend para la cédula y
// el pago (ver frontend/src/utils/ticketFields.js) para no duplicar bugs
// ya resueltos ahí.

const normalizar = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const LAST4_SIN_DATO = 'Cash / Comprado en punto de venta';

const obtenerCedula = (ticket) => {
  const clave = Object.keys(ticket).find(k => normalizar(k).includes('cedula'));
  return clave ? String(ticket[clave] || '').trim() : '';
};

const obtenerLast4 = (ticket) => {
  const valor = String(ticket['Last4/PayPal Email'] || '').trim();
  return valor || LAST4_SIN_DATO;
};

// Igual al armado de "retiraInfo" que ya usa TicketsPage.jsx para mostrar
// quién retiró en el modal de detalle del canje
const formatearRetira = (ticket) => {
  const quien = ticket.quienRetira || '';
  if (quien === 'Otro') {
    const parentesco = ticket.parentesco || 'N/A';
    const quienOtro = ticket.quienOtro || '';
    return `Otro (${parentesco}: ${quienOtro})`;
  }
  return quien || 'N/A';
};

const formatearFecha = (fecha) => {
  if (!fecha) return '';
  const d = new Date(fecha);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

const COLUMNAS_EXPORT = [
  'Name', 'Last Name', 'Email', 'Ticket', 'Seat', 'Transaction ID', 'Ticket ID',
  'Cedula', 'Last four', 'RETIRA', 'NÚMERO DE CEDULA', 'CELULAR', 'Responsable', 'Fecha'
];

// tickets: documentos .lean() con usuarioCanje/usuarioResponsable poblados
// (solo el campo 'nombre'). Incluye tickets canjeados y sin canjear: para
// estos últimos, RETIRA/NÚMERO DE CEDULA/CELULAR/Responsable/Fecha quedan
// vacíos porque esos datos solo existen a partir del canje.
const construirFilasTickets = (tickets) => {
  return tickets.map(ticket => {
    const responsable = ticket.usuarioCanje?.nombre || ticket.usuarioResponsable?.nombre || '';
    return {
      'Name': ticket['First Name'] || '',
      'Last Name': ticket['Last Name'] || '',
      'Email': ticket['Email'] || '',
      'Ticket': ticket['Ticket'] || '',
      'Seat': ticket['Seat'] || '',
      'Transaction ID': ticket['Transaction ID'] || '',
      'Ticket ID': ticket['Ticket ID'] || '',
      'Cedula': obtenerCedula(ticket),
      'Last four': obtenerLast4(ticket),
      'RETIRA': formatearRetira(ticket),
      'NÚMERO DE CEDULA': ticket.cedulaQuienRetira || '',
      'CELULAR': ticket.celular || '',
      'Responsable': responsable,
      'Fecha': formatearFecha(ticket.fechaCanje)
    };
  });
};

const escaparCsv = (valor) => {
  const texto = String(valor ?? '');
  if (/[",\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
};

const filasACsv = (filas) => {
  const encabezado = COLUMNAS_EXPORT.map(escaparCsv).join(',');
  const lineas = filas.map(fila => COLUMNAS_EXPORT.map(col => escaparCsv(fila[col])).join(','));
  // BOM al inicio para que Excel detecte UTF-8 y no rompa tildes/Ñ
  return '﻿' + [encabezado, ...lineas].join('\r\n');
};

module.exports = {
  COLUMNAS_EXPORT,
  obtenerCedula,
  obtenerLast4,
  formatearRetira,
  formatearFecha,
  construirFilasTickets,
  filasACsv
};
