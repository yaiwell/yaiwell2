import type {
  StripeActionErrorCode,
  StripeActionState,
} from '@/app/[locale]/panel/centro/stripe/actions';
import type { AppLocale } from '@/i18n/routing';
import type { ConnectAccountStatus, ConnectBusinessType } from '@/lib/services/payments';

/**
 * Tipos del componente StripeConnectCard.
 *
 * Solo `import type` desde `lib/services/payments` y desde las actions:
 * se borran al compilar y no arrastran Stripe ni Prisma al bundle.
 */

export interface StripeConnectCardProps {
  locale: AppLocale;
  /**
   * Estado de la cuenta Stripe del provider, resuelto en la page
   * (Server Component): la API de Stripe es solo de servidor.
   */
  status: ConnectAccountStatus;
  /**
   * La consulta a Stripe falló. La tarjeta muestra el aviso y solo
   * ofrece reintentar, sin badge ni CTA de alta que podrían ser falsos.
   */
  fetchFailed?: boolean;
  /** Aviso puntual al volver de Stripe (`?stripe=return|refresh-failed`). */
  inlineNotice?: 'return' | 'refresh-failed' | null;
}

/**
 * Estado visual de la tarjeta, derivado de `ConnectAccountStatus`.
 * El orden de evaluación está en `resolveConnectCardView`.
 */
export type ConnectCardState =
  | 'unavailable'
  | 'disconnected'
  | 'disabled'
  | 'onboardingIncomplete'
  | 'requirementsDue'
  | 'inReview'
  | 'payoutsPending'
  | 'active';

/** Color semántico del badge, mapeado a los tokens `--status-*`. */
export type ConnectCardTone = 'now' | 'soon' | 'busy' | 'info';

/** Qué acción ofrece el CTA principal de la tarjeta. */
export type ConnectCardPrimaryAction = 'connect' | 'continue' | 'completeData' | 'refresh';

/** Todo lo que la UI necesita para pintar un estado concreto. */
export interface ConnectCardView {
  state: ConnectCardState;
  tone: ConnectCardTone | null;
  primaryAction: ConnectCardPrimaryAction;
  /** Mostrar el selector autónomo/empresa (solo sin cuenta). */
  showBusinessTypePicker: boolean;
  /** Mostrar "Ver mi panel de Stripe" (solo Express con alta enviada). */
  showDashboardLink: boolean;
  /** Cuenta no Express: sin acciones de Stripe, se gestiona por soporte. */
  managedBySupport: boolean;
  /** Recordar cómo cambiar de autónomo a empresa (alta sin terminar). */
  showChangeTypeHelp: boolean;
}

/** Fallo devuelto por una action, tal cual para pintar el aviso. */
export type StripeActionFailure = Extract<StripeActionState, { ok: false }>;

export type { ConnectBusinessType, StripeActionErrorCode };
