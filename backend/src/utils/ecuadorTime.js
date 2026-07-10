/**
 * Utilidad para manejar fechas en zona horaria de Ecuador (UTC-5)
 */

// Obtener fecha actual en zona horaria de Ecuador
const getEcuadorDate = () => {
  const now = new Date();
  // Ecuador está en UTC-5 (no tiene horario de verano)
  const ecuadorOffset = -5 * 60; // -5 horas en minutos
  const utcOffset = now.getTimezoneOffset(); // Offset del sistema en minutos
  const ecuadorTime = new Date(now.getTime() + (utcOffset + ecuadorOffset) * 60000);
  return ecuadorTime;
};

// Obtener fecha en formato YYYY-MM-DD para Ecuador
const getEcuadorDateString = () => {
  const date = getEcuadorDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Convertir cualquier fecha a formato YYYY-MM-DD en zona horaria Ecuador
const toEcuadorDateString = (date = new Date()) => {
  const d = new Date(date);
  const ecuadorOffset = -5 * 60;
  const utcOffset = d.getTimezoneOffset();
  const ecuadorTime = new Date(d.getTime() + (utcOffset + ecuadorOffset) * 60000);
  
  const year = ecuadorTime.getFullYear();
  const month = String(ecuadorTime.getMonth() + 1).padStart(2, '0');
  const day = String(ecuadorTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Obtener timestamp actual de Ecuador
const getEcuadorTimestamp = () => {
  return getEcuadorDate().toISOString();
};

module.exports = {
  getEcuadorDate,
  getEcuadorDateString,
  toEcuadorDateString,
  getEcuadorTimestamp
};
