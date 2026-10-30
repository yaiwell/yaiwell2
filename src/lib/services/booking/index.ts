/**
 * API pública del módulo `booking`.
 *
 * Cualquier consumidor (API routes, server actions, webhooks de
 * Stripe, paneles) debe importar desde aquí. Importar archivos
 * internos del módulo directamente está prohibido por convención.
 */

export { cancelBookingByProvider, createBooking } from './booking.service';
export { cancelBookingByClient } from './booking.client-cancel.service';
export {
  AUTO_COMPLETE_DEFAULT_LIMIT,
  autoCompleteStaleOnsiteBookings,
  markBookingCompleted,
} from './booking.complete.service';
export { markBookingNoShow, undoBookingNoShow } from './booking.no-show.service';

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
  BookingNotNoShowError,
  BookingNotStartedError,
  BookingTooLateToCancelError,
  LastMinuteBookingNotCancellableError,
  NoShowUndoWindowClosedError,
  NoShowWindowClosedError,
  OnsiteBookingTooLateError,
  ServiceNotFoundError,
  ServicePausedError,
  SlotUnavailableError,
  UnauthorizedCancellationError,
} from './booking.errors';

export { BOOKING_TOO_SOON_ISSUE_CODE, isBookingTooSoonError } from './booking.validation';

export { BookingStatus } from './booking.types';
export type {
  AutoCompleteOnsiteSummary,
  BookingPaymentMode,
  BookingSummary,
  CancelBookingByProviderInput,
  CompleteBookingResult,
  CreateBookingInput,
  CreateBookingOptions,
  NoShowResult,
  UndoNoShowResult,
} from './booking.types';
