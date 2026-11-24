import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { BookingDates, BookingList, BookingRequest, BookingResponse, BookingSummary } from './types';

/**
 * Cliente del servicio de reservas (/api/booking).
 * - Métodos "raw": devuelven la APIResponse sin afirmar nada; la prueba decide qué esperar
 *   (así sirven igual para casos positivos y negativos).
 * - Métodos de conveniencia: combinan llamadas y devuelven datos tipados para fixtures y pruebas.
 */
export class BookingClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token?: string,
  ) {}

  /** El backend espera el token como cookie. */
  private get authHeaders(): Record<string, string> {
    return this.token ? { Cookie: `token=${this.token}` } : {};
  }

  // ---------- raw ----------

  /** POST /api/booking (público). Acepta cuerpos parciales para casos negativos. */
  create(body: Partial<BookingRequest> | Record<string, unknown>): Promise<APIResponse> {
    return this.request.post('/api/booking', { data: body });
  }

  /** GET /api/booking?roomid= (requiere token). */
  listByRoom(roomid: number): Promise<APIResponse> {
    return this.request.get('/api/booking', { params: { roomid }, headers: this.authHeaders });
  }

  /** GET /api/booking/{id} (requiere token). Hoy responde 500 en la demo (BUG-01). */
  getById(bookingid: number): Promise<APIResponse> {
    return this.request.get(`/api/booking/${bookingid}`, { headers: this.authHeaders });
  }

  /** GET /api/booking/summary?roomid= (requiere token): fechas ocupadas de la habitación. */
  summary(roomid: number): Promise<APIResponse> {
    return this.request.get('/api/booking/summary', { params: { roomid }, headers: this.authHeaders });
  }

  /** DELETE /api/booking/{id} (requiere token). Hoy responde 500 en la demo (BUG-01). */
  delete(bookingid: number): Promise<APIResponse> {
    return this.request.delete(`/api/booking/${bookingid}`, { headers: this.authHeaders });
  }

  // ---------- conveniencia ----------

  async bookingsInRoom(roomid: number): Promise<BookingResponse[]> {
    const response = await this.listByRoom(roomid);
    expect(response.status(), `GET /api/booking?roomid=${roomid}`).toBe(200);
    return ((await response.json()) as BookingList).bookings;
  }

  /** "Consultar una reserva": mientras GET /{id} falle, el listado por habitación es la vía funcional. */
  async findInRoom(roomid: number, bookingid: number): Promise<BookingResponse | undefined> {
    return (await this.bookingsInRoom(roomid)).find((b) => b.bookingid === bookingid);
  }

  /** Busca por apellido (los apellidos sintéticos son únicos por prueba). */
  async findByLastname(roomid: number, lastname: string): Promise<BookingResponse[]> {
    return (await this.bookingsInRoom(roomid)).filter((b) => b.lastname === lastname);
  }

  /** Rangos ya ocupados; se usan para elegir fechas disponibles antes de reservar. */
  async bookedRanges(roomid: number): Promise<BookingDates[]> {
    const response = await this.summary(roomid);
    expect(response.status(), `GET /api/booking/summary?roomid=${roomid}`).toBe(200);
    return ((await response.json()) as BookingSummary).bookings.map((b) => b.bookingDates);
  }
}
