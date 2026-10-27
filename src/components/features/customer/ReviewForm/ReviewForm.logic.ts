'use client';

import { useLocale } from 'next-intl';
import { useCallback, useState, useTransition, type FormEvent } from 'react';

import { submitReviewAction } from '@/app/[locale]/mis-reservas/actions';
import { useReviewFeedback } from '@/components/features/customer/ReviewFeedback';
// Import directo del fichero de validación, no del barrel `review`: el
// barrel reexporta el repositorio (Prisma) y lo arrastraría al bundle del
// cliente. `review.validation.ts` solo depende de zod.
import { createReviewSchema } from '@/lib/services/review/review.validation';

import type { ReviewFieldError, ReviewRating, SubmitReviewErrorCode } from './ReviewForm.types';

/** Solo los campos que rellena la persona; `bookingId` lo pone la card. */
const draftSchema = createReviewSchema.pick({ rating: true, text: true });

// Límites leídos del propio schema para que el contador y los mensajes
// no se desalineen si el dominio cambia la regla.
export const REVIEW_TEXT_MIN = createReviewSchema.shape.text.minLength ?? 10;
export const REVIEW_TEXT_MAX = createReviewSchema.shape.text.maxLength ?? 2000;

/**
 * Valida el borrador con el mismo schema que el servidor y lo traduce a
 * un único error de campo, el primero que la persona debe corregir.
 *
 * @param rating — puntuación elegida o `null` si aún no hay.
 * @param text — texto ya recortado (`trim`).
 * @returns el error a mostrar o `null` si el borrador es válido.
 */
export function validateReviewDraft(rating: number | null, text: string): ReviewFieldError | null {
  if (rating === null) return 'RATING_REQUIRED';

  const result = draftSchema.safeParse({ rating, text });
  if (result.success) return null;

  const issue = result.error.issues[0];
  if (issue?.path[0] === 'text') {
    return issue.code === 'too_big' ? 'TEXT_TOO_LONG' : 'TEXT_TOO_SHORT';
  }
  return 'RATING_REQUIRED';
}

/**
 * Hook del formulario de valoración: borrador, validación en cliente,
 * envío con `useTransition` y errores del servidor ya como códigos.
 *
 * Tras publicar, la action revalida `/mis-reservas` y la card sale de
 * "Valoraciones pendientes", así que este componente se desmonta casi a
 * la vez. Por eso el mensaje de éxito se anuncia también en
 * `ReviewFeedback`, que vive a nivel de página y sobrevive al refresco.
 */
export function useReviewForm(bookingId: string) {
  const locale = useLocale();
  const announce = useReviewFeedback();
  const [rating, setRating] = useState<ReviewRating | null>(null);
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState<ReviewFieldError | null>(null);
  const [serverError, setServerError] = useState<SubmitReviewErrorCode | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const changeRating = useCallback((value: ReviewRating) => {
    setRating(value);
    setFieldError(null);
    setServerError(null);
  }, []);

  const changeText = useCallback((value: string) => {
    setText(value);
    // Limpiamos el aviso al reescribir: puede haber dejado de aplicar.
    setFieldError(null);
    setServerError(null);
  }, []);

  const submit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = text.trim();
      const error = validateReviewDraft(rating, trimmed);
      if (error || rating === null) {
        setFieldError(error ?? 'RATING_REQUIRED');
        return;
      }

      startTransition(async () => {
        const result = await submitReviewAction(locale, { bookingId, rating, text: trimmed });
        if (!result.ok) {
          setServerError(result.code);
          return;
        }
        setSucceeded(true);
        announce?.();
      });
    },
    [announce, bookingId, locale, rating, text],
  );

  return {
    rating,
    text,
    textLength: text.trim().length,
    fieldError,
    serverError,
    succeeded,
    isPending,
    changeRating,
    changeText,
    submit,
  };
}
