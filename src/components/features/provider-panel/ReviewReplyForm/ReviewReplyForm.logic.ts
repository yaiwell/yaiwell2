'use client';

import { useCallback, useState, useTransition } from 'react';

import { replyToReviewAction } from '@/app/[locale]/panel/valoraciones/actions';
import type { AppLocale } from '@/i18n/routing';

import type { ReplyErrorCode } from './ReviewReplyForm.types';

/**
 * Límites de longitud alineados con `replyToReviewSchema` en
 * `review.validation.ts`. Se duplican aquí (en lugar de importar) para
 * evitar que un Client Component cargue el módulo de Zod del servidor.
 */
export const REPLY_MIN_LENGTH = 5;
export const REPLY_MAX_LENGTH = 1000;

/**
 * Hook que centraliza el estado del formulario de respuesta a una reseña.
 *
 * Mantiene `isExpanded` (form abierto/cerrado), el texto en borrador,
 * el estado de envío vía `useTransition` y un eventual código de error
 * traducible. El componente JSX solo consume el estado y dispara los
 * handlers; no toca la action directamente.
 */
export function useReviewReplyForm(reviewId: string, locale: AppLocale) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [errorCode, setErrorCode] = useState<ReplyErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();

  const openForm = useCallback(() => {
    setErrorCode(null);
    setIsExpanded(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsExpanded(false);
    setReplyText('');
    setErrorCode(null);
  }, []);

  const updateText = useCallback((value: string) => {
    setReplyText(value);
    // Si el usuario reescribe tras un error, limpiamos el banner para
    // no confundir el feedback (el error puede dejar de aplicar al
    // nuevo input).
    setErrorCode((prev) => (prev ? null : prev));
  }, []);

  /**
   * Envía la respuesta a la server action y, si triunfa, resetea el
   * formulario. El reset no recarga la página: `revalidatePath` desde
   * la action lo hace por nosotros y el Server Component padre vuelve
   * a renderizar con la respuesta ya persistida.
   */
  const submitReply = useCallback(() => {
    const trimmed = replyText.trim();
    if (trimmed.length < REPLY_MIN_LENGTH || trimmed.length > REPLY_MAX_LENGTH) {
      setErrorCode('VALIDATION');
      return;
    }

    startTransition(async () => {
      const result = await replyToReviewAction(locale, reviewId, trimmed);
      if (!result.ok) {
        // `PROVIDER_NOT_FOUND` se trata como error interno desde la UI
        // del propio panel: si llegamos aquí sin provider, algo muy raro
        // ha pasado en sesión y no tenemos copy específico que ayude.
        setErrorCode(result.code === 'PROVIDER_NOT_FOUND' ? 'INTERNAL' : result.code);
        return;
      }
      setIsExpanded(false);
      setReplyText('');
      setErrorCode(null);
    });
  }, [reviewId, locale, replyText]);

  const trimmedLength = replyText.trim().length;
  const isWithinLimits = trimmedLength >= REPLY_MIN_LENGTH && trimmedLength <= REPLY_MAX_LENGTH;

  return {
    isExpanded,
    replyText,
    errorCode,
    isPending,
    canSubmit: isWithinLimits && !isPending,
    openForm,
    closeForm,
    updateText,
    submitReply,
  };
}
