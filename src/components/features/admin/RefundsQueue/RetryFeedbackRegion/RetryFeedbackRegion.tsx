'use client';

import { useTranslations } from 'next-intl';

import {
  feedbackMessageKey,
  feedbackTone,
  RetryFeedbackContext,
  useRetryFeedbackState,
} from './RetryFeedbackRegion.logic';
import {
  retryFeedbackRegionBanner,
  retryFeedbackRegionStyles as s,
} from './RetryFeedbackRegion.styles';
import type { RetryFeedbackRegionProps } from './RetryFeedbackRegion.types';

/**
 * Región que envuelve la cola y muestra el resultado del último reintento.
 *
 * El contenedor `role="status"` está siempre en el DOM (aunque vacío)
 * para que los lectores de pantalla anuncien el mensaje cuando aparece.
 * Los hijos (la lista) se siguen renderizando en el servidor.
 */
export function RetryFeedbackRegion({ children }: RetryFeedbackRegionProps) {
  const t = useTranslations('adminArea.refunds');
  const { feedback, value } = useRetryFeedbackState();

  return (
    <RetryFeedbackContext.Provider value={value}>
      <div className={s.root}>
        <div role="status" aria-live="polite" data-component="admin-refunds-feedback">
          {feedback ? (
            <div className={retryFeedbackRegionBanner({ tone: feedbackTone(feedback) })}>
              <p>{t(feedbackMessageKey(feedback), { provider: feedback.providerName })}</p>
              <button type="button" className={s.dismiss} onClick={value.clear}>
                {t('feedback.dismiss')}
              </button>
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </RetryFeedbackContext.Provider>
  );
}
