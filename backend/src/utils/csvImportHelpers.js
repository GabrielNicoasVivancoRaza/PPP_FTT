const csv = require('csv-parser');
const { Readable } = require('stream');
const { CEDULA_REGEX } = require('./validators');

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

// Algunos CSV "crudos" (descargados directo, sin pasar por el script de
// limpieza) llegan con mojibake: texto que ya estaba en UTF-8 se volvió a
// interpretar como Latin-1/Windows-1252 y se re-guardó así, dejando "é"
// como "Ã©", "ñ" como "Ã±", etc. Esto rompe la detección de la columna de
// cédula por nombre (y también corrompe nombres con tilde en los datos).
// La "Ã" (U+00C3) casi no aparece nunca en texto en español bien
// codificado, así que su sola presencia alcanza como señal para reparar.
const repararMojibake = (texto) => {
  if (typeof texto !== 'string' || !texto.includes('Ã')) return texto;
  try {
    const reparado = Buffer.from(texto, 'latin1').toString('utf8');
    // Si la "reparación" generó caracteres de reemplazo, el texto no era
    // este tipo de mojibake — mejor no tocarlo
    return reparado.includes('�') ? texto : reparado;
  } catch {
    return texto;
  }
};

const repararFilaMojibake = (fila) => {
  const reparada = {};
  for (const [clave, valor] of Object.entries(fila)) {
    reparada[repararMojibake(clave)] = typeof valor === 'string' ? repararMojibake(valor) : valor;
  }
  return reparada;
};

// Parsea un Buffer de CSV (tal como llega de multer) a un arreglo de filas
// { nombreColumna: valor }, respetando los headers originales del archivo
// (ya reparados de mojibake si hacía falta).
const parseCsvBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const filas = [];
    const stream = new Readable();
    stream.push(quitarBOM(buffer));
    stream.push(null);

    stream
      .pipe(csv())
      .on('data', (row) => filas.push(repararFilaMojibake(row)))
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
  // momento, y algunos exports traen OTRA columna que también contiene la
  // palabra "cédula" en su nombre (ej. una pregunta de consentimiento tipo
  // "¿Entiende que debe presentar su cédula?" con respuesta "Entiendo").
  // Por eso no alcanza con quedarse con la primera columna que coincida:
  // entre todas las que coinciden, se prefiere la que tenga forma de
  // cédula real (solo números); si ninguna la tiene, se usa la primera
  // como antes (mejor eso que nada).
  const clavesCedula = Object.keys(row).filter(k => quitarAcentos(k).includes('cedula'));
  const claveCedula = clavesCedula.find(k => CEDULA_REGEX.test(String(row[k] || '').trim())) || clavesCedula[0];
  doc['Numero de Cedula:'] = claveCedula ? String(row[claveCedula] || '').trim() : '';

  const faltantes = REQUERIDOS.filter(campo => !doc[campo]);
  if (faltantes.length > 0) return null;

  doc.canjeado = false;
  doc.impreso = false;

  return doc;
};

module.exports = { parseCsvBuffer, mapRowToTicket, repararMojibake, CAMPOS_DIRECTOS, REQUERIDOS };
