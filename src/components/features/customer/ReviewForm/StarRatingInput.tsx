'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { cn } from '@/lib/utils';

import { reviewFormStyles as s } from './ReviewForm.styles';
import type { ReviewRating, StarRatingInputProps } from './ReviewForm.types';

const RATING_VALUES: readonly ReviewRating[] = [1, 2, 3, 4, 5];

/**
 * Selector de puntuación 1-5 como radio group nativo.
 *
 * Usamos `<input type="radio">` reales (ocultos con `sr-only`) en vez de
 * botones con `aria-pressed`: el navegador ya da la navegación con
 * flechas, el `Tab` único para todo el grupo y el anuncio «3 de 5» en los
 * lectores de pantalla. Cada opción lleva su etiqueta de texto
 * («4 estrellas: muy bien»), no solo el icono.
 */
export function StarRatingInput({ value, onChange, disabled, errorId }: StarRatingInputProps) {
  const t = useTranslations('customerArea.reviewForm');
  const groupName = useId();

  return (
    // `aria-invalid` y `aria-required` en el fieldset (role group): un
    // radio suelto no puede declarar que todo el grupo es obligatorio.
    <fieldset
      className={s.fieldset}
      aria-required="true"
      aria-invalid={errorId ? true : undefined}
      aria-describedby={errorId}
      data-component="customer-review-rating"
    >
      <legend className={s.legend}>{t('ratingLegend')}</legend>
      <div className={s.stars}>
        {RATING_VALUES.map((option) => (
          <label key={option} className={s.starLabel}>
            <input
              type="radio"
              name={groupName}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              disabled={disabled}
              className={s.starInput}
              data-component={`customer-review-star-${option}`}
            />
            <Star
              className={cn(
                s.starIcon,
                value !== null && option <= value ? s.starFilled : s.starEmpty,
              )}
              aria-hidden="true"
            />
            <span className="sr-only">
              {t('ratingOption', { count: option, label: t(`ratingLabels.${option}`) })}
            </span>
          </label>
        ))}
      </div>
      {/* Eco visual de la etiqueta elegida; ya la anuncia el radio. */}
      <p className={s.ratingCaption} aria-hidden="true">
        {value !== null ? t(`ratingLabels.${value}`) : t('ratingPrompt')}
      </p>
    </fieldset>
  );
}
