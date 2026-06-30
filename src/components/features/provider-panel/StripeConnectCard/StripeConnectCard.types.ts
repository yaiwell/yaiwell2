import type { AppLocale } from '@/i18n/routing';
import type { ConnectAccountStatus } from '@/lib/services/payments';

export interface StripeConnectCardProps {
  locale: AppLocale;
  /**
   * Estado actual de la cuenta Stripe del provider. Se computa en la
   * page (Server Component) y se pasa ya resuelto para evitar un
   * fetch desde el cliente — Stripe API es server-only.
   */
  status: ConnectAccountStatus;
  /**
   * `null` si la consulta a Stripe falló. La UI muestra un banner
   * informativo y un botón "Reintentar" en lugar de un badge falso.
   * El error en sí se loguea en la page; aquí solo recibimos el
   * indicador binario.
   */
  fetchFailed?: boolean;
  /**
   * Notice puntual de retorno del onboarding (`?stripe=return` /
   * `?stripe=refresh-failed`). La UI lo muestra como banner temporal.
   */
  inlineNotice?: 'return' | 'refresh-failed' | null;
}
