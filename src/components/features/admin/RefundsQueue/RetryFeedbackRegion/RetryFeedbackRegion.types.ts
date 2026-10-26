import type { ReactNode } from 'react';

import type { RetryRefundErrorCode } from '@/app/[locale]/admin/reembolsos/actions';

/**
 * Desenlace del último reintento, ya listo para pintarse.
 *
 * `error` cubre los rechazos de la action (no admin, reserva que ya no
 * está en cola…); los otros tres son las respuestas de Stripe.
 */
export type RetryFeedback =
  | { kind: 'succeeded' | 'failed' | 'not_applicable'; providerName: string }
  | { kind: 'error'; providerName: string; code: RetryRefundErrorCode };

/** Claves i18n (bajo `adminArea.refunds`) que puede pintar el aviso. */
export type FeedbackMessageKey =
  | 'feedback.succeeded'
  | 'feedback.failed'
  | 'feedback.notApplicable'
  | `feedback.errors.${RetryRefundErrorCode}`;

export interface RetryFeedbackContextValue {
  report: (feedback: RetryFeedback) => void;
  clear: () => void;
}

export interface RetryFeedbackRegionProps {
  children: ReactNode;
}
