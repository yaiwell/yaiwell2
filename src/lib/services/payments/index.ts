/**
 * API pública del módulo `payments` (Stripe Connect).
 *
 * NO client-safe: el service importa `Stripe` (Node SDK). Solo callers
 * server (server actions del `/panel/centro/stripe/*`). El `'server-only'`
 * en service + repository protege con un fallo claro en dev si alguien
 * lo importa accidentalmente desde un Client.
 */

export {
  createOnboardingLink,
  ensureConnectAccount,
  getConnectAccountStatus,
  getProviderPaymentsStatus,
  startOnboardingFlow,
} from './payments.service';

export {
  ProviderForPaymentsNotFoundError,
  StripeAccountNotConnectedError,
  StripeOperationError,
} from './payments.errors';

export type { ConnectAccountStatus, ConnectOnboardingLink } from './payments.types';
