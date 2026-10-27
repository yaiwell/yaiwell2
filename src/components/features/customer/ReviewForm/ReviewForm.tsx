'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { REVIEW_TEXT_MAX, REVIEW_TEXT_MIN, useReviewForm } from './ReviewForm.logic';
import { reviewFormStyles as s } from './ReviewForm.styles';
import type { ReviewFormProps } from './ReviewForm.types';
import { StarRatingInput } from './StarRatingInput';

/**
 * Formulario de valoración de una reserva completada: estrellas 1-5 y
 * texto de 10 a 2000 caracteres.
 *
 * Sin fotos: el producto las descarta (decisión del 2026-10-27) y la
 * action rechaza `photos`.
 *
 * La lógica vive en `useReviewForm`; aquí solo se compone la UI.
 */
export function ReviewForm({ bookingId, onClose }: ReviewFormProps) {
  const t = useTranslations('customerArea.reviewForm');
  const ids = useId();
  const textId = `${ids}-text`;
  const ratingErrorId = `${ids}-rating-error`;
  const textErrorId = `${ids}-text-error`;
  const {
    rating,
    text,
    textLength,
    fieldError,
    serverError,
    succeeded,
    isPending,
    changeRating,
    changeText,
    submit,
  } = useReviewForm(bookingId);

  if (succeeded) {
    return (
      <div className={s.form} data-component={`customer-review-form-success-${bookingId}`}>
        <p className={s.success} role="status">
          {t('success')}
        </p>
        {onClose ? (
          <div className={s.actions}>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('close')}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const ratingError = fieldError === 'RATING_REQUIRED';
  const textError = fieldError === 'TEXT_TOO_SHORT' || fieldError === 'TEXT_TOO_LONG';

  return (
    <form
      className={s.form}
      onSubmit={submit}
      noValidate
      data-component={`customer-review-form-${bookingId}`}
    >
      <StarRatingInput
        value={rating}
        onChange={changeRating}
        disabled={isPending}
        errorId={ratingError ? ratingErrorId : undefined}
      />
      {ratingError ? (
        <p id={ratingErrorId} className={s.fieldError} role="alert">
          {t('fieldErrors.RATING_REQUIRED')}
        </p>
      ) : null}

      <div className={s.textField}>
        <label htmlFor={textId} className={s.textLabel}>
          {t('textLabel')}
        </label>
        <textarea
          id={textId}
          className={s.textarea}
          value={text}
          placeholder={t('textPlaceholder')}
          onChange={(event) => changeText(event.target.value)}
          disabled={isPending}
          aria-invalid={textError}
          aria-describedby={textError ? textErrorId : `${textId}-hint`}
          data-component="customer-review-text"
        />
        <div className={s.textMeta}>
          <span id={`${textId}-hint`}>{t('textHint', { min: REVIEW_TEXT_MIN })}</span>
          <span
            className={cn(textLength > REVIEW_TEXT_MAX && s.counterOver)}
            data-component="customer-review-counter"
          >
            {t('counter', { count: textLength, max: REVIEW_TEXT_MAX })}
          </span>
        </div>
        {textError ? (
          <p id={textErrorId} className={s.fieldError} role="alert">
            {fieldError === 'TEXT_TOO_LONG'
              ? t('fieldErrors.TEXT_TOO_LONG', { max: REVIEW_TEXT_MAX })
              : t('fieldErrors.TEXT_TOO_SHORT', { min: REVIEW_TEXT_MIN })}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p className={s.serverError} role="alert" data-component="customer-review-error">
          {t(`errors.${serverError}`)}
        </p>
      ) : null}

      <div className={s.actions}>
        {onClose ? (
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            {t('cancel')}
          </Button>
        ) : null}
        <Button type="submit" disabled={isPending} data-component="customer-review-submit">
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </div>
    </form>
  );
}
