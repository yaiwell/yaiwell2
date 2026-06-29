'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { REPLY_MAX_LENGTH, useReviewReplyForm } from './ReviewReplyForm.logic';
import { reviewReplyFormStyles as s } from './ReviewReplyForm.styles';
import type { ReviewReplyFormProps } from './ReviewReplyForm.types';

/**
 * Formateadores estables por locale para la fecha en la que se publicó
 * una respuesta ya existente. Reutilizamos el mismo set que el resto del
 * panel para que el formato sea coherente en toda la sección de reseñas.
 */
const DATE_FORMATTERS: Record<'es' | 'ca' | 'en' | 'de', Intl.DateTimeFormat> = {
  es: new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
  ca: new Intl.DateTimeFormat('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
  en: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  de: new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }),
};

/**
 * Bloque inferior de una reseña: o bien la respuesta ya publicada del
 * proveedor (modo "sin botón"), o bien el flujo de respuesta nuevo
 * (botón "Responder" → textarea → submit/cancel).
 *
 * Client Component porque maneja estado local (form abierto, texto
 * borrador, error) y usa `useTransition` para el estado de pending al
 * llamar a la server action.
 */
export function ReviewReplyForm({ reviewId, locale, existingResponse }: ReviewReplyFormProps) {
  const t = useTranslations('providerPanel.reviews.reply');
  const tCard = useTranslations('providerPanel.reviews.card');
  const {
    isExpanded,
    replyText,
    errorCode,
    isPending,
    canSubmit,
    openForm,
    closeForm,
    updateText,
    submitReply,
  } = useReviewReplyForm(reviewId, locale);

  // Si ya hay respuesta publicada, mostramos la card y nada más. v1 no
  // permite editar respuestas existentes (decisión documentada en TODO).
  if (existingResponse) {
    const dateFormatter = DATE_FORMATTERS[locale];
    return (
      <div className={s.responseBox} data-component={`review-reply-existing-${reviewId}`}>
        <div className={s.responseHeader}>
          <span className={s.responseTitle}>{t('alreadyReplied')}</span>
          <span className={s.responseDate}>
            {dateFormatter.format(existingResponse.respondedAt)}
          </span>
        </div>
        <p className={s.responseText}>{existingResponse.text}</p>
      </div>
    );
  }

  return (
    <div className={s.root} data-component={`review-reply-${reviewId}`}>
      <span className={s.pendingBadge}>{tCard('pending')}</span>

      {isExpanded ? (
        <div className={s.form} data-component={`review-reply-form-${reviewId}`}>
          <textarea
            className={s.textarea}
            value={replyText}
            placeholder={t('placeholder')}
            maxLength={REPLY_MAX_LENGTH}
            onChange={(e) => updateText(e.target.value)}
            aria-label={t('placeholder')}
            data-component={`review-reply-textarea-${reviewId}`}
            disabled={isPending}
          />
          <div className={s.formMeta}>
            <span className={s.charCounter} aria-hidden>
              {replyText.length}/{REPLY_MAX_LENGTH}
            </span>
            {errorCode ? (
              <span
                className={s.error}
                role="alert"
                data-component={`review-reply-error-${reviewId}`}
              >
                {t(`errors.${errorCode}` as const)}
              </span>
            ) : null}
          </div>
          <div className={s.formActions}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeForm}
              disabled={isPending}
              data-component={`review-reply-cancel-${reviewId}`}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={submitReply}
              disabled={!canSubmit}
              data-component={`review-reply-submit-${reviewId}`}
            >
              {isPending ? t('submitting') : t('submit')}
            </Button>
          </div>
        </div>
      ) : (
        <div className={s.actionsRow}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openForm}
            data-component={`review-reply-open-${reviewId}`}
          >
            {t('button')}
          </Button>
        </div>
      )}
    </div>
  );
}
