import { test, expect } from '../../src/fixtures';
import { BookingRequest, ValidationErrorBody } from '../../src/api/types';

/**
 * Escenario 2 — API negativa: dato obligatorio ausente o inválido.
 * Se valida (a) el rechazo con 400 y mensaje de validación, y (b) que no se creó la reserva,
 * buscando el apellido único de la prueba en el listado de la habitación.
 */
type Mutation = (body: BookingRequest) => Record<string, unknown>;

const cases: { title: string; mutate: Mutation; expectedError: string }[] = [
  {
    title: 'sin firstname (obligatorio ausente)',
    mutate: ({ firstname: _omit, ...rest }) => rest,
    expectedError: 'Firstname should not be blank',
  },
  {
    title: 'email con formato inválido',
    mutate: (body) => ({ ...body, email: 'no-es-un-email' }),
    expectedError: 'must be a well-formed email address',
  },
  {
    title: 'teléfono demasiado corto',
    mutate: (body) => ({ ...body, phone: '123' }),
    expectedError: 'size must be between 11 and 21',
  },
];

test.describe('Reserva por API — validaciones', { tag: ['@api', '@regression'] }, () => {
  for (const c of cases) {
    test(`rechaza la reserva: ${c.title}`, async ({ bookingApi, bookingDraft }) => {
      const valid = await bookingDraft({ roomid: 1 });
      const invalid = c.mutate(valid);

      await test.step('POST /api/booking responde 400 con el error de validación', async () => {
        const response = await bookingApi.create(invalid);
        expect(response.status()).toBe(400);
        const body = (await response.json()) as ValidationErrorBody;
        expect(body.errors).toContain(c.expectedError);
      });

      await test.step('no existe ninguna reserva con el apellido de la prueba', async () => {
        expect(await bookingApi.findByLastname(valid.roomid, valid.lastname)).toHaveLength(0);
      });
    });
  }
});
