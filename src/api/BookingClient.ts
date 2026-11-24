import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { BookingDates, BookingList, BookingRequest, BookingResponse, BookingSummary } from './types';

/**
 * Cliente del servicio de reservas (/api/booking).
 * Los métodos "raw" devuelven la APIResponse sin afirmar nada: las pruebas deciden qué esperar.
 * Los métodos de conveniencia (createOk, findInRoom, ...) afirman lo mínimo para ser útiles en fixtures.
 */
export class BookingClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token?: string,
  ) {}

  private get authHeaders(): Record<string, string> {
    return this.token ? { Cookie: `token=${this.token}` } : {};
  }

  // ---------- llamadas raw ----------

  /** POST /api/booking (público, no requiere token). Acepta cuerpos parciales para casos negativos. */
  create(body: Partial<BookingRequest> | Record<string, unknown>): Promise<APIResponse> {
    return this.request.post('/api/booking', { data: body });
  }

  /** GET /api/booking?roomid= (requiere token). */
  listByRoom(roomid: number): Promise<APIResponse> {
    return this.request.get('/api/booking', { params: { roomid }, headers: this.authHeaders });
  }

  /** GET /api/booking/{id} (requiere token). Ver BUG-01: hoy responde 500 en la demo. */
  getById(bookingid: number): Promise<APIResponse> {
    return this.request.get(`/api/booking/${bookingid}`, { headers: this.authHeaders });
  }

  /** GET /api/booking/summary?roomid= (requiere token): fechas ocupadas de la habitación. */
  summary(roomid: number): Promise<APIResponse> {
    return this.request.get('/api/booking/summary', { params: { roomid }, headers: this.authHeaders });
  }

  /** DELETE /api/booking/{id} (requiere token). Ver BUG-01. */
  delete(bookingid: number): Promise<APIResponse> {
    return this.request.delete(`/api/booking/${bookingid}`, { headers: this.authHeaders });
  }

  // ---------- conveniencia ----------

  async bookingsInRoom(roomid: number): Promise<BookingResponse[]> {
    const response = await this.listByRoom(roomid);
    expect(response.status(), `GET /api/booking?roomid=${roomid}`).toBe(200);
    return ((await response.json()) as BookingList).bookings;
  }

  /** "Consultar una reserva": el único endpoint de lectura funcional hoy es el listado por habitación. */
  async findInRoom(roomid: number, bookingid: number): Promise<BookingResponse | undefined> {
    return (await this.bookingsInRoom(roomid)).find((b) => b.bookingid === bookingid);
  }

  /** Busca por apellido (los apellidos sintéticos son únicos por prueba). */
  async findByLastname(roomid: number, lastname: string): Promise<BookingResponse[]> {
    return (await this.bookingsInRoom(roomid)).filter((b) => b.lastname === lastname);
  }

  async bookedRanges(roomid: number): Promise<BookingDates[]> {
    const response = await this.summary(roomid);
    expect(response.status(), `GET /api/booking/summary?roomid=${roomid}`).toBe(200);
    return ((await response.json()) as BookingSummary).bookings.map((b) => b.bookingDates);
  }
}
