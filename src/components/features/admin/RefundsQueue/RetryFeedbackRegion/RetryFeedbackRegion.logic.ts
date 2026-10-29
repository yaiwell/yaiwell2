'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type {
  FeedbackMessageKey,
  RetryFeedback,
  RetryFeedbackContextValue,
} from './RetryFeedbackRegion.types';

/**
 * Contexto del aviso de resultado de la cola de reembolsos.
 *
 * Por qué vive fuera de la fila: un reintento con éxito revalida la
 * página y la reserva desaparece de la lista, así que un estado local
 * del botón se perdería al desmontarse. La región envuelve toda la cola
 * y sobrevive al refresco, de modo que el aviso sigue visible.
 */
export const RetryFeedbackContext = createContext<RetryFeedbackContextValue | null>(null);

/** Estado del aviso para el proveedor del contexto. */
export function useRetryFeedbackState() {
  const [feedback, setFeedback] = useState<RetryFeedback | null>(null);

  const report = useCallback((next: RetryFeedback) => setFeedback(next), []);
  const clear = useCallback(() => setFeedback(null), []);

  const value = useMemo<RetryFeedbackContextValue>(() => ({ report, clear }), [report, clear]);

  return { feedback, value };
}

/**
 * Acceso al aviso desde un botón de reintento.
 *
 * Fuera de la región devuelve no-ops: así el botón se puede montar
 * aislado (tests, otras vistas) sin romperse.
 */
export function useRetryFeedback(): RetryFeedbackContextValue {
  return useContext(RetryFeedbackContext) ?? NOOP_CONTEXT;
}

const NOOP_CONTEXT: RetryFeedbackContextValue = {
  report: () => undefined,
  clear: () => undefined,
};

/** Clave i18n (bajo `adminArea.refunds`) del mensaje de un aviso. */
export function feedbackMessageKey(feedback: RetryFeedback): FeedbackMessageKey {
  switch (feedback.kind) {
    case 'succeeded':
      return 'feedback.succeeded';
    case 'failed':
      return 'feedback.failed';
    case 'not_applicable':
      return 'feedback.notApplicable';
    case 'dismissed':
      return 'feedback.dismissed';
    case 'error':
      return `feedback.errors.${feedback.code}`;
    case 'dismiss-error':
      return `feedback.dismissErrors.${feedback.code}`;
  }
}

/** Tono visual del aviso: éxito, advertencia o error. */
export function feedbackTone(feedback: RetryFeedback): 'success' | 'warning' | 'error' {
  if (feedback.kind === 'succeeded' || feedback.kind === 'dismissed') return 'success';
  if (feedback.kind === 'not_applicable') return 'warning';
  return 'error';
}
