'use client';

import { useCallback, useState, useTransition } from 'react';

import {
  resumeIncidentRefundAction,
  type IncidentRefundActionOutcome,
} from '@/app/[locale]/admin/reembolsos/incident-actions';
import type { AppLocale } from '@/i18n/routing';
import type { IncidentSlotState } from '@/lib/services/checkout';
import { formatRefundAmount } from '@/lib/utils/admin-refund-format';

import type { IncidentRefundFailure } from './IncidentRefundPanel.logic';

/** Resultado del último «Completar»; vive fuera de la fila, que desaparece. */
export type UnfinishedFeedback =
  | {
      kind: 'outcome';
      outcome: IncidentRefundActionOutcome;
      slot: IncidentSlotState;
      amount: string;
    }
  | { kind: 'failure'; failure: IncidentRefundFailure };

/**
 * Hook de la lista de reembolsos a medias.
 *
 * Al completar uno, la página se revalida y su fila desaparece: el aviso se
 * guarda en la lista, que sigue montada aunque se quede vacía.
 */
export function useUnfinishedIncidentRefunds(locale: AppLocale) {
  const [feedback, setFeedback] = useState<UnfinishedFeedback | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const complete = useCallback(
    (bookingId: string, priceCents: number) => {
      setFeedback(null);
      setPendingId(bookingId);
      startTransition(async () => {
        try {
          const state = await resumeIncidentRefundAction(locale, bookingId);
          if (state.ok) {
            setFeedback({
              kind: 'outcome',
              outcome: state.outcome,
              slot: state.slot,
              amount: formatRefundAmount(priceCents, locale),
            });
          } else if (state.code === 'INVALID_NOTE') {
            // Reanudar no pide motivo: no debería ocurrir nunca.
            setFeedback({ kind: 'failure', failure: { code: 'INTERNAL' } });
          } else {
            setFeedback({ kind: 'failure', failure: state });
          }
        } catch {
          // Una respuesta perdida no dice si se aplicó: el texto pide comprobarlo.
          setFeedback({ kind: 'failure', failure: { code: 'INTERNAL' } });
        } finally {
          setPendingId(null);
        }
      });
    },
    [locale],
  );

  return { feedback, pendingId, isPending, complete };
}
