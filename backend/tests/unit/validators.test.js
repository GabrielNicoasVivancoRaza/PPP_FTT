const { isValidPhone, isValidName } = require('../../src/utils/validators');

describe('validators.isValidPhone', () => {
  test('acepta un celular de solo dígitos', () => {
    expect(isValidPhone('0991234567')).toBe(true);
  });

  test('rechaza un celular con letras', () => {
    expect(isValidPhone('099abc4567')).toBe(false);
  });

  test('rechaza un celular con menos de 7 dígitos', () => {
    expect(isValidPhone('12345')).toBe(false);
  });

  test('rechaza un celular con más de 15 dígitos', () => {
    expect(isValidPhone('1234567890123456')).toBe(false);
  });

  test('rechaza un celular con espacios o guiones', () => {
    expect(isValidPhone('099-123-4567')).toBe(false);
    expect(isValidPhone('099 123 4567')).toBe(false);
  });

  test('rechaza valores vacíos o no-string', () => {
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone(undefined)).toBe(false);
    expect(isValidPhone(null)).toBe(false);
  });
});

describe('validators.isValidName', () => {
  test('acepta un nombre simple', () => {
    expect(isValidName('Juan Perez')).toBe(true);
  });

  test('acepta nombres con acentos y ñ', () => {
    expect(isValidName('María José Núñez')).toBe(true);
  });

  test('acepta nombres con apóstrofe o guion', () => {
    expect(isValidName("O'Connor")).toBe(true);
    expect(isValidName('Jean-Paul')).toBe(true);
  });

  test('rechaza un nombre con números', () => {
    expect(isValidName('Juan123')).toBe(false);
  });

  test('rechaza un nombre de un solo carácter', () => {
    expect(isValidName('A')).toBe(false);
  });

  test('rechaza valores vacíos o no-string', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName(undefined)).toBe(false);
    expect(isValidName(null)).toBe(false);
  });
});
