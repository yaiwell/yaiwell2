'use client';

import { useCallback, useTransition } from 'react';

import { retryRefundAction } from '@/app/[locale]/admin/reembolsos/actions';
import type { AppLocale } from '@/i18n/routing';

import { useRetryFeedback } from '../RetryFeedbackRegion';

/**
 * Hook que dispara el reintento de un reembolso y publica el desenlace.
 *
 * `isPending` deshabilita el botón mientras la action está en curso:
 * aunque Stripe no deja reembolsar dos veces el mismo cargo, un doble clic
 * solo generaría ruido en Stripe y en Sentry.
 */
export function useRetryRefund(bookingId: string, providerName: string, locale: AppLocale) {
  const [isPending, startTransition] = useTransition();
  const { report, clear } = useRetryFeedback();

  const retry = useCallback(() => {
    clear();
    startTransition(async () => {
      try {
        const state = await retryRefundAction(locale, bookingId);
        if (state.ok) {
          report({ kind: state.outcome, providerName });
        } else {
          report({ kind: 'error', providerName, code: state.code });
        }
      } catch {
        // Fallo de red o de la propia action: sin detalles para la UI.
        report({ kind: 'error', providerName, code: 'INTERNAL' });
      }
    });
  }, [bookingId, providerName, locale, report, clear]);

  return { isPending, retry };
}
