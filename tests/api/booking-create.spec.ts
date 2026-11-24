import { test, expect } from '../../src/fixtures';
import { BookingResponse } from '../../src/api/types';

/**
 * Escenario 1 — API exitosa: crear una reserva y consultarla.
 * Parametrizado con dos conjuntos de datos (habitación, noches, depósito, nombre).
 */
const dataSets = [
  { title: 'habitación Single, 2 noches, sin depósito', roomid: 1, nights: 2, depositpaid: false, firstname: 'Andersson' },
  { title: 'habitación Suite, 4 noches, con depósito', roomid: 3, nights: 4, depositpaid: true, firstname: 'Mariana' },
];

test.describe('Reserva por API — flujo exitoso', { tag: ['@api', '@smoke', '@regression'] }, () => {
  for (const data of dataSets) {
    test(`crea y consulta una reserva: ${data.title}`, async ({ bookingApi, bookingDraft, trackBooking }) => {
      const request = await bookingDraft({
        roomid: data.roomid,
        nights: data.nights,
        depositpaid: data.depositpaid,
        guest: { firstname: data.firstname },
      });

      const created = await test.step('POST /api/booking responde 201 con la reserva creada', async () => {
        const response = await bookingApi.create(request);
        expect(response.status()).toBe(201);
        const body = (await response.json()) as BookingResponse;
        trackBooking(body.bookingid);

        expect(body.bookingid, 'identidad: bookingid numérico positivo').toEqual(expect.any(Number));
        expect(body.bookingid).toBeGreaterThan(0);
        expect(body).toMatchObject({
          roomid: request.roomid,
          firstname: request.firstname,
          lastname: request.lastname,
          depositpaid: request.depositpaid,
          bookingdates: request.bookingdates,
        });
        return body;
      });

      await test.step('GET /api/booking?roomid= devuelve el mismo registro', async () => {
        const stored = await bookingApi.findInRoom(request.roomid, created.bookingid);
        expect(stored, `la reserva ${created.bookingid} debe aparecer en la habitación ${request.roomid}`).toBeDefined();
        expect(stored).toEqual(created);
      });

      await test.step('GET /api/booking/summary refleja las fechas ocupadas', async () => {
        const ranges = await bookingApi.bookedRanges(request.roomid);
        expect(ranges).toContainEqual(request.bookingdates);
      });
    });
  }
});

test.describe('Reserva por API — contrato vs observado', { tag: ['@api', '@regression'] }, () => {
  /**
   * Contrato documentado: GET /booking/{id} devuelve la reserva (200).
   * Observado: la demo responde 500 en todas las rutas con id (BUG-01).
   * test.fail() mantiene la expectativa del contrato: si el bug se corrige, esta prueba "falla"
   * y avisa que hay que quitar la marca. No es una aserción debilitada.
   */
  test('consulta por id según contrato (BUG-01 conocido)', { tag: ['@known-bug'] }, async ({ bookingApi, bookingDraft, trackBooking }) => {
    test.fail(true, 'BUG-01: GET /api/booking/{id} responde 500 en la demo');
    const request = await bookingDraft({ roomid: 2 });
    const createResponse = await bookingApi.create(request);
    expect(createResponse.status()).toBe(201);
    const { bookingid } = (await createResponse.json()) as BookingResponse;
    trackBooking(bookingid);

    const response = await bookingApi.getById(bookingid);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ bookingid, roomid: 2, lastname: request.lastname });
  });
});
