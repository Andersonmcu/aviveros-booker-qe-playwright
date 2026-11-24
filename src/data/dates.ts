import { BookingDates } from '../api/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY_MS);
}

/** Dos rangos [checkin, checkout) se solapan si uno empieza antes de que el otro termine. */
export function overlaps(a: BookingDates, b: BookingDates): boolean {
  return a.checkin < b.checkout && b.checkin < a.checkout;
}

/**
 * Elige un rango de fechas futuro y libre para la habitación.
 * Se usa una ventana amplia (1 a ~6 años adelante) y aleatoria para que workers paralelos y
 * otros usuarios de la demo compartida no colisionen; además se excluyen los rangos ya ocupados.
 */
export function pickAvailableRange(booked: BookingDates[], nights = 2, today = new Date()): BookingDates {
  for (let attempt = 0; attempt < 200; attempt++) {
    const offset = 365 + Math.floor(Math.random() * 365 * 5);
    const checkinDate = addDays(today, offset);
    const candidate = { checkin: toIsoDate(checkinDate), checkout: toIsoDate(addDays(checkinDate, nights)) };
    if (!booked.some((r) => overlaps(r, candidate))) return candidate;
  }
  throw new Error('No se encontró un rango libre tras 200 intentos: revisar el estado de la demo');
}
