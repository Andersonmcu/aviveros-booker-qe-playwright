/** Contratos observados de la API (ver docs/contrato-vs-observado.md). */

export interface BookingDates {
  /** Formato ISO yyyy-MM-dd */
  checkin: string;
  checkout: string;
}

/** Límites observados: firstname 3-18, lastname 3-30, phone 11-21, email bien formado. */
export interface Guest {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
}

/** Cuerpo de POST /api/booking */
export interface BookingRequest extends Guest {
  roomid: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
}

/**
 * Respuesta de POST /api/booking y elementos de GET /api/booking?roomid=
 * La API no devuelve email ni phone, por lo que no se pueden verificar por esta vía.
 */
export interface BookingResponse {
  bookingid: number;
  roomid: number;
  firstname: string;
  lastname: string;
  depositpaid: boolean;
  bookingdates: BookingDates;
}

export interface BookingList {
  bookings: BookingResponse[];
}

/** GET /api/booking/summary?roomid= (usa `bookingDates` en camelCase, distinto a `bookingdates`) */
export interface BookingSummary {
  bookings: { bookingDates: BookingDates }[];
}

export interface ValidationErrorBody {
  errors: string[];
}
