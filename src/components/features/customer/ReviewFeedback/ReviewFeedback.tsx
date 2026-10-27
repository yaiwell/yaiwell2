'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { ReviewFeedbackContext, useReviewFeedbackState } from './ReviewFeedback.logic';
import { reviewFeedbackStyles as s } from './ReviewFeedback.styles';

/**
 * Envuelve el listado de `/mis-reservas` y pinta, encima, el aviso
 * «¡Gracias! Tu valoración ya es visible…» cuando el formulario lo
 * anuncia. Ver `ReviewFeedback.logic.ts` para el porqué.
 *
 * El aviso es `role="status"` para que los lectores de pantalla lo lean
 * aunque el foco se haya perdido al desmontarse el diálogo.
 */
export function ReviewFeedbackProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('customerArea.reviewForm');
  const { visible, announce, dismiss } = useReviewFeedbackState();

  return (
    <ReviewFeedbackContext.Provider value={announce}>
      <div className={s.root}>
        <div role="status" aria-live="polite">
          {visible ? (
            <div className={s.banner} data-component="customer-review-success">
              <p className={s.message}>{t('success')}</p>
              <button
                type="button"
                className={s.dismiss}
                onClick={dismiss}
                aria-label={t('dismiss')}
                data-component="customer-review-success-dismiss"
              >
                <X className={s.dismissIcon} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </ReviewFeedbackContext.Provider>
  );
}
