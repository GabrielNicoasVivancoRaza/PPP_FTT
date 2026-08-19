// Validadores/saneadores de formato compartidos por los formularios
// (celular: solo dígitos, nombres: solo letras)

export const PHONE_REGEX = /^[0-9]{7,15}$/;
export const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿÑñ][A-Za-zÀ-ÖØ-öø-ÿÑñ' -]{1,99}$/;
export const CEDULA_REGEX = /^[0-9]{5,15}$/;

// Elimina en tiempo real cualquier carácter que no sea dígito
export const onlyDigits = (value) => value.replace(/[^0-9]/g, '');

// Elimina en tiempo real números y símbolos no permitidos en un nombre
export const onlyLetters = (value) => value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿÑñ' -]/g, '');

export const isValidPhone = (value) => PHONE_REGEX.test((value || '').trim());

export const isValidName = (value) => NAME_REGEX.test((value || '').trim());

export const isValidCedula = (value) => CEDULA_REGEX.test((value || '').trim());
