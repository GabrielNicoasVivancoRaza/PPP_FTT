const csv = require('csv-parser');
const { Readable } = require('stream');

// Columnas del CSV que sí nos interesan, mapeadas 1:1 al nombre que ya usa
// el resto de la app en Mongo. Todo lo demás (precios, direcciones,
// tarjetas, etc.) se descarta — es un whitelist en vez de blacklist para no
// depender de mantener una lista de columnas "a eliminar" que se rompe cada
// vez que SquadUp cambia su formato de exportación.
const CAMPOS_DIRECTOS = [
  'First Name',
  'Last Name',
  'Email',
  'Ticket',
  'Seat',
  'Transaction ID',
  'Transaction Date (Local)',
  'Barcode Data',
  'Ticket ID'
];

// Campos sin los cuales un ticket no se considera válido para importar
const REQUERIDOS = ['First Name', 'Last Name', 'Email', 'Ticket', 'Seat', 'Transaction ID', 'Ticket ID'];

const quitarAcentos = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const quitarBOM = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.slice(3);
  }
  return buffer;
};

// Parsea un Buffer de CSV (tal como llega de multer) a un arreglo de filas
// { nombreColumna: valor }, respetando los headers originales del archivo.
const parseCsvBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const filas = [];
    const stream = new Readable();
    stream.push(quitarBOM(buffer));
    stream.push(null);

    stream
      .pipe(csv())
      .on('data', (row) => filas.push(row))
      .on('end', () => resolve(filas))
      .on('error', reject);
  });
};

// Convierte una fila cruda del CSV a un documento de ticket con solo los
// campos que usamos (whitelist). Devuelve null si faltan campos
// obligatorios, para que el llamador la descarte.
const mapRowToTicket = (row) => {
  const doc = {};

  CAMPOS_DIRECTOS.forEach(campo => {
    if (row[campo] !== undefined && row[campo] !== null) {
      doc[campo] = String(row[campo]).trim();
    }
  });

  // La columna de cédula varía en acentos/espacios según el export del
  // momento; se detecta por nombre normalizado y se guarda con el nombre
  // canónico que usa el resto de la app.
  const claveCedula = Object.keys(row).find(k => quitarAcentos(k).includes('cedula'));
  doc['Numero de Cedula:'] = claveCedula ? String(row[claveCedula] || '').trim() : '';

  const faltantes = REQUERIDOS.filter(campo => !doc[campo]);
  if (faltantes.length > 0) return null;

  doc.canjeado = false;
  doc.impreso = false;

  return doc;
};

module.exports = { parseCsvBuffer, mapRowToTicket, CAMPOS_DIRECTOS, REQUERIDOS };
