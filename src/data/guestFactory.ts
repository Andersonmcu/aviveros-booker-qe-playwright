import { Guest } from '../api/types';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function randomLetters(n: number): string {
  return Array.from({ length: n }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
}

/**
 * Huésped sintético. El apellido lleva un sufijo aleatorio para que cada prueba pueda
 * identificar *su* registro en una demo compartida (y verificar que un rechazo no lo creó).
 * Límites observados: firstname 3-18, lastname 3-30, phone 11-21, email válido.
 */
export function buildGuest(overrides: Partial<Guest> = {}): Guest {
  const suffix = randomLetters(6);
  const lastname = `Qa${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`;
  return {
    firstname: 'Andersson',
    lastname,
    email: `qe.${suffix}@example.com`,
    phone: `0${Math.floor(1e10 + Math.random() * 9e10)}`, // 11 dígitos
    ...overrides,
  };
}
