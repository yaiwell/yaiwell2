/**
 * API pública del módulo `checkout` (cobro de reservas con Stripe).
 *
 * NO client-safe: el service importa el SDK de Stripe (Node) y Prisma.
 * Los consumidores válidos son server actions y route handlers; el
 * marker `'server-only'` de service y repository rompe el build con un
 * mensaje claro si un Client Component lo importa por error.
 */

export { createBookingCheckout } from './checkout.service';
export { createOnsiteBooking, getPaymentOptions } from './checkout.onsite.service';
export type { OnsiteBookingHooks } from './checkout.onsite.service';
export { isProviderOnsiteReady, resolvePaymentOptions } from './checkout.onsite';
export type { PaymentOptionsInput, ProviderOnsiteStatus } from './checkout.onsite';

export { cancelBookingByProviderWithRefund } from './checkout.refund.service';
export { cancelBookingByClientWithRefund } from './checkout.client-cancel.service';

export { listPendingRefunds, retryBookingRefund } from './checkout.refund-queue.service';
export { dismissBookingRefund } from './checkout.refund-dismiss.service';

export { checkBookingPayable } from './checkout.hold-check.service';
export type { BookingPayability } from './checkout.hold-check.service';

export { expireAbandonedPendingBookings } from './checkout.expiry.service';

export { recordAsyncRefundFailure } from './checkout.refund-events.service';

export { getBookingForConfirmation } from './checkout.confirmation.service';
export type { BookingConfirmationData } from './checkout.confirmation.service';

export { confirmBookingPayment, failBookingPayment } from './checkout.webhook.service';
export { refundBookingPayment } from './checkout.charge-refunded.service';

export { checkoutRepository } from './checkout.repository';

export {
  BookingForCheckoutNotFoundError,
  BookingHoldExpiredError,
  MissingBookingReferenceError,
  OnsitePaymentNotAllowedError,
  PaymentIntentCreationError,
  ProfessionalNotResolvedError,
  ProviderNotChargeableError,
  RefundFailedError,
  RefundNotApplicableError,
  RefundNotDismissableError,
  RefundNotInQueueError,
} from './checkout.errors';
export type { OnsitePaymentBlockReason } from './checkout.errors';

export {
  cancelBookingWithRefundSchema,
  createBookingCheckoutSchema,
  createOnsiteBookingSchema,
  dismissBookingRefundSchema,
  getPaymentOptionsSchema,
  retryBookingRefundSchema,
  verifyBookingPayableSchema,
} from './checkout.validation';
export type {
  CancelBookingWithRefundParsed,
  CreateBookingCheckoutParsed,
  CreateOnsiteBookingParsed,
  DismissBookingRefundParsed,
  GetPaymentOptionsParsed,
  RetryBookingRefundParsed,
} from './checkout.validation';

export type {
  BookingCancellationResult,
  BookingCheckoutSession,
  BookingTransitionResult,
  ExpirePendingSummary,
  OnsiteBookingResult,
  OnsitePaymentOption,
  PaymentOptions,
  PendingRefundSummary,
  ProviderCancellationResult,
  RefundOutcome,
  RetryRefundOutcome,
  RetryRefundResult,
} from './checkout.types';
