/**
 * Fixtures del proyecto. Las pruebas importan `test` y `expect` desde aquí, no desde @playwright/test.
 * Cada fixture prepara lo que la prueba necesita y limpia al terminar (el código después de `use`).
 */
import { test as base, expect } from '@playwright/test';
import { AuthClient } from '../api/AuthClient';
import { BookingClient } from '../api/BookingClient';
import { BookingRequest, Guest } from '../api/types';
import { env } from '../config/env';
import { pickAvailableRange } from '../data/dates';
import { buildGuest } from '../data/guestFactory';
import { ReservationPage } from '../pages/ReservationPage';

export interface BookingDraftOptions {
  roomid: number;
  nights?: number;
  depositpaid?: boolean;
  guest?: Partial<Guest>;
}

type WorkerFixtures = {
  /** Token admin, uno por worker: un solo login por proceso. */
  adminToken: string;
};

type TestFixtures = {
  /** Cliente de reservas autenticado. */
  bookingApi: BookingClient;
  /** Construye un BookingRequest con huésped sintético y fechas libres consultadas al backend. */
  bookingDraft: (options: BookingDraftOptions) => Promise<BookingRequest>;
  /** Registra ids creados para intentar limpiarlos al final de la prueba. */
  trackBooking: (bookingid: number) => void;
  /** Page object de /reservation/{roomid}. */
  reservationPage: ReservationPage;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  adminToken: [
    async ({ playwright }, use) => {
      // Contexto HTTP propio: la fixture `request` es por test y no puede usarse con alcance worker.
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

  reservationPage: async ({ page }, use) => {
    await use(new ReservationPage(page));
  },

  trackBooking: async ({ bookingApi }, use, testInfo) => {
    const ids: number[] = [];
    await use((id) => ids.push(id));
    // Teardown best-effort: hoy DELETE responde 500 en la demo (BUG-01). No se oculta: queda anotado en el reporte.
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
