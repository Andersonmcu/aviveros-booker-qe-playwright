import { Locator, Page, expect } from '@playwright/test';
import { BookingDates, Guest } from '../api/types';

/**
 * Página /reservation/{roomid}?checkin=&checkout= (componente BookingForm del frontend).
 * Flujo del producto: la tarjeta "Book This Room" muestra el calendario con las fechas de la URL ya
 * seleccionadas → "Reserve Now" despliega el formulario del huésped → "Reserve Now" envía POST /api/booking
 * → la tarjeta cambia a "Booking Confirmed" con el rango "checkin - checkout".
 *
 * Locators tomados del código oficial (assets/src/components/reservation/BookingForm.tsx): los inputs
 * tienen aria-label, así que se ubican por rol + nombre accesible. Los métodos no hacen aserciones de negocio.
 */
export class ReservationPage {
  readonly bookingCardHeading: Locator;
  /** El mismo texto aparece en las dos fases (elegir fechas / enviar huésped); solo hay uno visible a la vez. */
  readonly reserveNowButton: Locator;
  readonly firstnameInput: Locator;
  readonly lastnameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  /** Errores de validación que devuelve el backend (alert de Bootstrap). */
  readonly bookingErrors: Locator;
  readonly confirmationHeading: Locator;

  constructor(private readonly page: Page) {
    this.bookingCardHeading = page.getByRole('heading', { name: 'Book This Room' });
    this.reserveNowButton = page.getByRole('button', { name: 'Reserve Now' });
    this.firstnameInput = page.getByRole('textbox', { name: 'Firstname' });
    this.lastnameInput = page.getByRole('textbox', { name: 'Lastname' });
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.phoneInput = page.getByRole('textbox', { name: 'Phone' });
    this.bookingErrors = page.getByRole('alert');
    this.confirmationHeading = page.getByRole('heading', { name: 'Booking Confirmed' });
  }

  /** Abre la reserva con las fechas preseleccionadas por query string y espera a que la tarjeta cargue. */
  async open(roomid: number, dates: BookingDates): Promise<void> {
    const query = new URLSearchParams({ checkin: dates.checkin, checkout: dates.checkout });
    await this.page.goto(`/reservation/${roomid}?${query}`);
    // La tarjeta solo se pinta cuando GET /api/room/{id} responde (hoy 500 en la demo: BUG-01).
    await expect(this.bookingCardHeading).toBeVisible();
  }

  /** Confirma las fechas elegidas y abre el formulario del huésped. */
  async startBooking(): Promise<void> {
    await this.reserveNowButton.click();
    await expect(this.firstnameInput).toBeVisible();
  }

  async fillGuest(guest: Guest): Promise<void> {
    await this.firstnameInput.fill(guest.firstname);
    await this.lastnameInput.fill(guest.lastname);
    await this.emailInput.fill(guest.email);
    await this.phoneInput.fill(guest.phone);
  }

  async submit(): Promise<void> {
    await this.reserveNowButton.click();
  }

  /** Rango que la tarjeta de confirmación muestra como "yyyy-MM-dd - yyyy-MM-dd". */
  confirmedRange(dates: BookingDates): Locator {
    return this.page.getByText(`${dates.checkin} - ${dates.checkout}`, { exact: true });
  }
}
