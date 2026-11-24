/** Contratos observados de la API (ver docs/contrato-vs-observado.md). */

export interface BookingDates {
  /** Formato ISO yyyy-MM-dd */
  checkin: string;
  checkout: string;
}

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

/** Respuesta de POST /api/booking y elementos de GET /api/booking?roomid= */
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

/** GET /api/booking/summary?roomid= (nota: usa `bookingDates` en camelCase, distinto a `bookingdates`) */
export interface BookingSummary {
  bookings: { bookingDates: BookingDates }[];
}

export interface ValidationErrorBody {
  errors: string[];
}
