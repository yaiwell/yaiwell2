/**
 * API pública del módulo `payments` (Stripe Connect).
 *
 * NO client-safe: los services importan `Stripe` (Node SDK) y Prisma.
 * Solo callers server (server actions y páginas de `/panel/centro`). El
 * `'server-only'` de cada service da un fallo claro si alguien lo
 * importa desde un Client Component. Los Client Components solo pueden
 * importar de aquí con `import type`, que se borra al compilar.
 */

export {
  continueOnboardingFlow,
  createOnboardingLink,
  ensureConnectAccount,
  startOnboardingFlow,
} from './payments.service';
export { getConnectAccountStatus, getProviderPaymentsStatus } from './payments.status';
export { createDashboardLoginLink } from './payments.dashboard';
export { buildConnectReturnUrls, NO_CONNECT_ACCOUNT_STATUS } from './payments.mappers';
export { startConnectOnboardingSchema } from './payments.validation';

export {
  InvalidConnectBusinessTypeError,
  StripeAccountAlreadyConnectedError,
  ProviderForPaymentsNotFoundError,
  StripeAccountNotConnectedError,
  StripeAccountNotExpressError,
  StripeDashboardUnavailableError,
  StripeOperationError,
} from './payments.errors';

export type {
  ConnectAccountStatus,
  ConnectBusinessType,
  ConnectDashboardType,
  ConnectOnboardingLink,
  ConnectReturnUrls,
} from './payments.types';
