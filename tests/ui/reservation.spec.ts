import { test, expect } from '../../src/fixtures';
import { BookingResponse } from '../../src/api/types';

/**
 * Escenario 3 — UI + API: un huésped completa la reserva en /reservation/{roomid} con fechas libres,
 * ve la confirmación y el mismo registro queda guardado en el backend (habitación, fechas, nombre, apellido).
 *
 * Contra el backend real, sin page.route. Hoy la página no carga en la demo porque GET /api/room/{id}
 * responde 500 (BUG-01): la prueba falla en el primer paso de UI y deja trace/screenshot como evidencia.
 */
const dataSets = [
  { title: 'habitación 1', roomid: 1, nights: 2, firstname: 'Andersson' },
  { title: 'habitación 2', roomid: 2, nights: 3, firstname: 'Mariana' },
];

test.describe('Reserva por UI verificada por API', { tag: ['@ui', '@smoke', '@regression'] }, () => {
  for (const data of dataSets) {
    test(`reserva por UI y la consulta por API: ${data.title}`, async ({ reservationPage, bookingApi, bookingDraft, trackBooking }) => {
      // Fechas libres consultadas al backend y huésped con apellido único para encontrar *este* registro.
      const draft = await test.step('preparar fechas libres y huésped sintético', () =>
        bookingDraft({ roomid: data.roomid, nights: data.nights, guest: { firstname: data.firstname } }),
      );

      await test.step('completar la reserva en la UI', async () => {
        await reservationPage.open(data.roomid, draft.bookingdates);
        await reservationPage.startBooking();
        await reservationPage.fillGuest(draft);
        await reservationPage.submit();
      });

      await test.step('la UI confirma la reserva con las fechas elegidas', async () => {
        await expect(reservationPage.bookingErrors).toBeHidden();
        await expect(reservationPage.confirmationHeading).toBeVisible();
        await expect(reservationPage.confirmedRange(draft.bookingdates)).toBeVisible();
      });

      await test.step('GET /api/booking?roomid= devuelve el mismo registro', async () => {
        let stored: BookingResponse[] = [];
        await expect
          .poll(async () => (stored = await bookingApi.findByLastname(data.roomid, draft.lastname)).length, {
            message: `la reserva de ${draft.lastname} debe aparecer en la habitación ${data.roomid}`,
          })
          .toBe(1);

        const [booking] = stored;
        trackBooking(booking.bookingid);
        expect(booking.bookingid, 'identidad: bookingid numérico positivo').toBeGreaterThan(0);
        expect(booking).toMatchObject({
          roomid: data.roomid,
          firstname: draft.firstname,
          lastname: draft.lastname,
          bookingdates: draft.bookingdates,
        });
      });
    });
  }
});
