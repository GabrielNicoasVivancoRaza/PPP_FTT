// Validadores reutilizables de formato para campos de formularios
// (celular: solo dígitos, nombres: solo letras)

const PHONE_REGEX = /^[0-9]{7,15}$/;
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿÑñ][A-Za-zÀ-ÖØ-öø-ÿÑñ' -]{1,99}$/;
const CEDULA_REGEX = /^[0-9]{5,15}$/;

const isValidPhone = (value) => typeof value === 'string' && PHONE_REGEX.test(value.trim());

const isValidName = (value) => typeof value === 'string' && NAME_REGEX.test(value.trim());

const isValidCedula = (value) => typeof value === 'string' && CEDULA_REGEX.test(value.trim());

module.exports = {
  PHONE_REGEX,
  NAME_REGEX,
  CEDULA_REGEX,
  isValidPhone,
  isValidName,
  isValidCedula
};
