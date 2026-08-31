/**
 * API pública del módulo `checkout` (cobro de reservas con Stripe).
 *
 * NO client-safe: el service importa el SDK de Stripe (Node) y Prisma.
 * Los consumidores válidos son server actions y route handlers; el
 * marker `'server-only'` de service y repository rompe el build con un
 * mensaje claro si un Client Component lo importa por error.
 */

export { createBookingCheckout } from './checkout.service';

export { getBookingForConfirmation } from './checkout.confirmation.service';
export type { BookingConfirmationData } from './checkout.confirmation.service';

export {
  confirmBookingPayment,
  failBookingPayment,
  refundBookingPayment,
} from './checkout.webhook.service';

export { checkoutRepository } from './checkout.repository';

export {
  BookingForCheckoutNotFoundError,
  MissingBookingReferenceError,
  PaymentIntentCreationError,
  ProfessionalNotResolvedError,
  ProviderNotChargeableError,
} from './checkout.errors';

export { createBookingCheckoutSchema } from './checkout.validation';
export type { CreateBookingCheckoutParsed } from './checkout.validation';

export type { BookingCheckoutSession, BookingTransitionResult } from './checkout.types';
