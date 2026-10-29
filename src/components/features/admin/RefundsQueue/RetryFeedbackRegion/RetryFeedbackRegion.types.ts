import type { ReactNode } from 'react';

import type {
  DismissRefundErrorCode,
  RetryRefundErrorCode,
} from '@/app/[locale]/admin/reembolsos/actions';

/**
 * Desenlace de la última acción sobre la cola, ya listo para pintarse.
 *
 * `error` cubre los rechazos del reintento (no admin, reserva que ya no
 * está en cola…); `succeeded`, `failed` y `not_applicable` son las
 * respuestas de Stripe. `dismissed` y `dismiss-error` son el descarte
 * manual, que tiene sus propios mensajes.
 */
export type RetryFeedback =
  | { kind: 'succeeded' | 'failed' | 'not_applicable' | 'dismissed'; providerName: string }
  | { kind: 'error'; providerName: string; code: RetryRefundErrorCode }
  | { kind: 'dismiss-error'; providerName: string; code: DismissRefundErrorCode };

/** Claves i18n (bajo `adminArea.refunds`) que puede pintar el aviso. */
export type FeedbackMessageKey =
  | 'feedback.succeeded'
  | 'feedback.failed'
  | 'feedback.notApplicable'
  | 'feedback.dismissed'
  | `feedback.errors.${RetryRefundErrorCode}`
  | `feedback.dismissErrors.${DismissRefundErrorCode}`;

export interface RetryFeedbackContextValue {
  report: (feedback: RetryFeedback) => void;
  clear: () => void;
}

export interface RetryFeedbackRegionProps {
  children: ReactNode;
}
