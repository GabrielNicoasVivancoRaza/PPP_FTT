// Normaliza un nombre para poder compararlo por igualdad exacta sin
// importar tildes, mayúsculas/minúsculas ni espacios de más — usado para
// emparejar el nombre de un ticket con el archivo de "sobres" (ubicación
// física de los boletos impresos), que no comparte ningún ID con los
// tickets, solo el nombre de la persona.
const normalizarNombre = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');

module.exports = { normalizarNombre };
