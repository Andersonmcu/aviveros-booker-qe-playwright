import { test, expect } from '../../src/fixtures';
import { BookingList, BookingResponse, ValidationErrorBody } from '../../src/api/types';

/**
 * Contrato documentado (colección Postman + semántica HTTP) vs. comportamiento observado.
 * Ver docs/contrato-vs-observado.md. Las pruebas marcadas con test.fail mantienen la expectativa del contrato
 * para un bug conocido: dejan evidencia en el reporte y se ponen rojas cuando el bug se corrija.
 */
test.describe('Reserva por API — contrato vs observado (validaciones)', { tag: ['@api', '@regression'] }, () => {
  test('email y phone son opcionales según la documentación', async ({ bookingApi, bookingDraft, trackBooking }) => {
    const { email: _email, phone: _phone, ...withoutContact } = await bookingDraft({ roomid: 2 });

    const response = await bookingApi.create(withoutContact);
    expect(response.status()).toBe(201);
    const body = (await response.json()) as BookingResponse;
    trackBooking(body.bookingid);
    expect(body).toMatchObject({ roomid: 2, lastname: withoutContact.lastname, bookingdates: withoutContact.bookingdates });
  });

  test('sin bookingdates responde 400 (BUG-02 conocido)', { tag: ['@known-bug'] }, async ({ bookingApi, bookingDraft }) => {
    test.fail(true, 'BUG-02: sin bookingdates responde 500 en vez de 400');
    const { bookingdates: _omit, ...withoutDates } = await bookingDraft({ roomid: 2 });

    const response = await bookingApi.create(withoutDates);
    expect(response.status(), 'un dato obligatorio ausente es error del cliente (400), no del servidor').toBe(400);
    expect(((await response.json()) as ValidationErrorBody).errors).toEqual(expect.arrayContaining([expect.any(String)]));
    expect(await bookingApi.findByLastname(2, withoutDates.lastname)).toHaveLength(0);
  });

  test('checkout anterior al checkin responde 400 (BUG-03 conocido)', { tag: ['@known-bug'] }, async ({ bookingApi, bookingDraft }) => {
    test.fail(true, 'BUG-03: fechas invertidas responden 409 (conflicto) en vez de 400');
    const valid = await bookingDraft({ roomid: 2 });
    const inverted = { ...valid, bookingdates: { checkin: valid.bookingdates.checkout, checkout: valid.bookingdates.checkin } };

    const response = await bookingApi.create(inverted);
    expect(response.status(), 'fechas inválidas deben distinguirse de un conflicto de disponibilidad').toBe(400);
    expect(await bookingApi.findByLastname(2, valid.lastname)).toHaveLength(0);
  });

  test('GET /booking/ sin roomid devuelve todas las reservas (BUG-05 conocido)', { tag: ['@known-bug'] }, async ({ bookingApi }) => {
    test.fail(true, 'BUG-05: sin roomid responde 400 "Room ID is required"');
    const response = await bookingApi.listAll();
    expect(response.status()).toBe(200);
    expect(((await response.json()) as BookingList).bookings).toEqual(expect.any(Array));
  });
});
