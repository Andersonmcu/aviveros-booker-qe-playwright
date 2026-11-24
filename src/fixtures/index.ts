import { test as base, expect } from '@playwright/test';
import { AuthClient } from '../api/AuthClient';
import { BookingClient } from '../api/BookingClient';
import { BookingRequest, Guest } from '../api/types';
import { env } from '../config/env';
import { pickAvailableRange } from '../data/dates';
import { buildGuest } from '../data/guestFactory';

export interface BookingDraftOptions {
  roomid: number;
  nights?: number;
  depositpaid?: boolean;
  guest?: Partial<Guest>;
}

type WorkerFixtures = {
  /** Token admin, uno por worker (login una sola vez por proceso). */
  adminToken: string;
};

type TestFixtures = {
  /** Cliente de reservas autenticado. */
  bookingApi: BookingClient;
  /** Construye un BookingRequest con huésped sintético y fechas libres consultadas al backend. */
  bookingDraft: (options: BookingDraftOptions) => Promise<BookingRequest>;
  /** Registra ids creados para intentar limpiarlos al final de la prueba. */
  trackBooking: (bookingid: number) => void;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  adminToken: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext({ baseURL: env.baseURL });
      const token = await new AuthClient(request).login(env.adminUser, env.adminPassword);
      await use(token);
      await request.dispose();
    },
    { scope: 'worker' },
  ],

  bookingApi: async ({ request, adminToken }, use) => {
    await use(new BookingClient(request, adminToken));
  },

  bookingDraft: async ({ bookingApi }, use) => {
    await use(async ({ roomid, nights = 2, depositpaid = false, guest }) => {
      const booked = await bookingApi.bookedRanges(roomid);
      return {
        roomid,
        depositpaid,
        bookingdates: pickAvailableRange(booked, nights),
        ...buildGuest(guest),
      };
    });
  },

  trackBooking: async ({ bookingApi }, use, testInfo) => {
    const ids: number[] = [];
    await use((id) => ids.push(id));
    // Limpieza best-effort: hoy DELETE responde 500 en la demo (BUG-01). No se oculta: queda anotado.
    for (const id of ids) {
      const response = await bookingApi.delete(id);
      if (!response.ok()) {
        testInfo.annotations.push({
          type: 'cleanup',
          description: `No se pudo borrar la reserva ${id}: DELETE respondió ${response.status()} (ver BUG-01)`,
        });
      }
    }
  },
});

export { expect };
