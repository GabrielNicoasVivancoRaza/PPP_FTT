// Búsqueda general de tickets (nombre, email, cédula, Ticket ID, Transaction
// ID), compartida por getTickets, getTicketsByPuntoVenta y getTicketsForStaff
// para no repetir (ni volver a romper) la misma lógica tres veces.
//
// Corrige dos bugs que hacían que la búsqueda fallara:
//  1. Solo se buscaba en el campo 'Numero de Cedula:' (sin tilde), pero la
//     mayoría de los tickets reales tienen la columna 'Número de Cédula:'
//     (con tilde) — la búsqueda de cédula casi nunca encontraba nada.
//  2. Ticket ID y Transaction ID se buscaban por igualdad exacta, así que
//     no filtraban a medida que se escribía, solo con el valor completo.
//
// Además, ahora la búsqueda es insensible a tildes: escribir "jose" (sin
// tilde) encuentra "José", y viceversa.

// Variantes reales del nombre de columna de cédula según cómo se haya
// importado el CSV (con/sin tilde, con/sin espacio final) — mismo problema
// que ya se resolvió del lado de lectura en frontend/src/utils/ticketFields.js
const CAMPOS_CEDULA = ['Numero de Cedula:', 'Número de Cédula:', 'Número de Cédula: '];

// Letras con variantes acentuadas frecuentes en nombres en español
const VARIANTES_ACENTO = {
  a: 'aáàäâã',
  e: 'eéèëê',
  i: 'iíìïî',
  o: 'oóòöôõ',
  u: 'uúùüû',
  n: 'nñ'
};

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const quitarTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Arma un regex de MongoDB que coincide en cualquier parte del texto (no
 * exige coincidencia exacta ni desde el inicio) sin importar tildes ni
 * mayúsculas/minúsculas. Así "jose" encuentra "José", "JOSÉ", "Jose Pérez", etc.
 */
const buildFlexibleRegex = (texto) => {
  const sinTildes = quitarTildes(String(texto || ''));
  const escapado = escaparRegex(sinTildes);
  const patron = escapado.replace(/[aeioun]/gi, (caracter) => {
    const variantes = VARIANTES_ACENTO[caracter.toLowerCase()];
    return variantes ? `[${variantes}]` : caracter;
  });
  return new RegExp(patron, 'i');
};

/**
 * Filtro $or de "búsqueda general": nombre, apellido, email, todas las
 * variantes de columna de cédula, Ticket ID y Transaction ID. Todos con
 * coincidencia parcial (para que filtre a medida que se escribe).
 */
const buildGeneralSearchFilter = (searchTerm) => {
  const regex = buildFlexibleRegex(String(searchTerm || '').trim());
  return {
    $or: [
      { 'First Name': regex },
      { 'Last Name': regex },
      { 'Email': regex },
      { 'Ticket ID': regex },
      { 'Transaction ID': regex },
      ...CAMPOS_CEDULA.map(campo => ({ [campo]: regex }))
    ]
  };
};

module.exports = { buildFlexibleRegex, buildGeneralSearchFilter, CAMPOS_CEDULA };
