'use client';

import { useCallback, useId, useState, useTransition, type FormEvent } from 'react';

import { dismissRefundAction } from '@/app/[locale]/admin/reembolsos/actions';
import type { AppLocale } from '@/i18n/routing';
import {
  REFUND_DISMISS_REASON_MAX_LENGTH,
  REFUND_DISMISS_REASON_MIN_LENGTH,
} from '@/lib/utils/refund-dismiss-reason';

import { useRetryFeedback } from '../RetryFeedbackRegion';

/**
 * Comprobación en cliente del motivo, con los mismos límites que el
 * schema Zod del servidor. Solo es UX: la action vuelve a validarlo.
 */
export function isDismissReasonValid(reason: string): boolean {
  const length = reason.trim().length;
  return length >= REFUND_DISMISS_REASON_MIN_LENGTH && length <= REFUND_DISMISS_REASON_MAX_LENGTH;
}

/**
 * Hook del descarte de una entrada de la cola: abre y cierra el
 * formulario, valida el motivo y publica el desenlace en la región de
 * aviso compartida (la fila desaparece al revalidar, así que un estado
 * local se perdería).
 */
export function useDismissRefund(bookingId: string, providerName: string, locale: AppLocale) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [showReasonError, setShowReasonError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { report, clear } = useRetryFeedback();
  const idBase = useId();

  const open = useCallback(() => {
    clear();
    setIsOpen(true);
  }, [clear]);

  const cancel = useCallback(() => {
    setIsOpen(false);
    setReason('');
    setShowReasonError(false);
  }, []);

  const changeReason = useCallback((value: string) => {
    setReason(value);
    // El error se retira en cuanto el motivo es válido, no al reenviar.
    if (isDismissReasonValid(value)) setShowReasonError(false);
  }, []);

  const submit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isDismissReasonValid(reason)) {
        setShowReasonError(true);
        return;
      }
      clear();
      startTransition(async () => {
        try {
          const state = await dismissRefundAction(locale, bookingId, reason);
          if (state.ok) {
            report({ kind: 'dismissed', providerName });
          } else if (state.code === 'INVALID_REASON') {
            setShowReasonError(true);
          } else {
            report({ kind: 'dismiss-error', providerName, code: state.code });
          }
        } catch {
          // Fallo de red o de la propia action: sin detalles para la UI.
          report({ kind: 'dismiss-error', providerName, code: 'INTERNAL' });
        }
      });
    },
    [bookingId, providerName, locale, reason, report, clear],
  );

  return {
    isOpen,
    reason,
    showReasonError,
    isPending,
    ids: { reason: `${idBase}-reason`, hint: `${idBase}-hint`, error: `${idBase}-error` },
    open,
    cancel,
    changeReason,
    submit,
  };
}
