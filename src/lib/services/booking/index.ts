/**
 * API pública del módulo `booking`.
 *
 * Cualquier consumidor (API routes, server actions, webhooks de
 * Stripe, paneles) debe importar desde aquí. Importar archivos
 * internos del módulo directamente está prohibido por convención.
 */

export { cancelBookingByProvider, createBooking, markBookingCompleted } from './booking.service';
export { cancelBookingByClient } from './booking.client-cancel.service';

export { bookingRepository } from './booking.repository';

export {
  PENDING_HOLD_MINUTES,
  PENDING_HOLD_PAYMENT_MARGIN_MS,
  activeBookingWhere,
  getPendingHoldCutoff,
  isBookingHoldingSlot,
} from './booking.hold';

export {
  BookingNotCancellableError,
  BookingNotConfirmedError,
  BookingNotFoundError,
  BookingTooLateToCancelError,
  LastMinuteBookingNotCancellableError,
  ServiceNotFoundError,
  ServicePausedError,
  SlotUnavailableError,
  UnauthorizedCancellationError,
} from './booking.errors';

export { BOOKING_TOO_SOON_ISSUE_CODE, isBookingTooSoonError } from './booking.validation';

export { BookingStatus } from './booking.types';
export type {
  BookingSummary,
  CancelBookingByProviderInput,
  CreateBookingInput,
} from './booking.types';
