'use client';

import { useCallback, useState } from 'react';

import type { ModerationOutcome } from './VerificationDetail.types';

/**
 * Hook que gestiona el resultado mock de la moderación.
 *
 * Mantiene en estado:
 *  - `outcome`: el resultado aplicado (`approved` / `rejected` / null).
 *  - `toastVisible`: si se está mostrando el toast de confirmación.
 *
 * Al pulsar aprobar/rechazar guardamos el resultado y mostramos el
 * toast. Tras la primera acción los botones se deshabilitan para
 * evitar dobles disparos accidentales. El toast puede cerrarse
 * manualmente.
 */
export function useVerificationModeration() {
  const [outcome, setOutcome] = useState<ModerationOutcome>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const approve = useCallback(() => {
    setOutcome('approved');
    setToastVisible(true);
  }, []);

  const reject = useCallback(() => {
    setOutcome('rejected');
    setToastVisible(true);
  }, []);

  const dismissToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  return { outcome, toastVisible, approve, reject, dismissToast };
}
