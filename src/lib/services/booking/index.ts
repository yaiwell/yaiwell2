/**
 * API pública del módulo `booking`.
 *
 * Cualquier consumidor (API routes, server actions, webhooks de
 * Stripe, paneles) debe importar desde aquí. Importar archivos
 * internos del módulo directamente está prohibido por convención.
 */

export { cancelBookingByProvider, createBooking, markBookingCompleted } from './booking.service';

export { bookingRepository } from './booking.repository';

export {
  BookingNotConfirmedError,
  BookingNotFoundError,
  BookingTooLateToCancelError,
  ServiceNotFoundError,
  ServicePausedError,
  SlotUnavailableError,
  UnauthorizedCancellationError,
} from './booking.errors';

export { BookingStatus } from './booking.types';
export type {
  BookingSummary,
  CancelBookingByProviderInput,
  CreateBookingInput,
} from './booking.types';
