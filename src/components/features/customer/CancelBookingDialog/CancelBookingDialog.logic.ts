'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState, useTransition } from 'react';

import { cancelMyBookingAction } from '@/app/[locale]/mis-reservas/cancel-actions';
import { useReviewFeedback } from '@/components/features/customer/ReviewFeedback';
import { useCancellationWindow } from '@/components/shared/CancellationWindow';

import type { CancelMyBookingErrorCode } from './CancelBookingDialog.types';

/** Datos que necesita el hook del diálogo. */
interface UseCancelBookingDialogArgs {
  bookingId: string;
  /** Importe ya formateado para el mensaje del resultado. */
  amountLabel: string;
  startAtIso: string;
  /** Vigilar la ventana de 2 h (no aplica a una `pending` sin cobro). */
  enforceWindow: boolean;
}

/**
 * Estado del diálogo de cancelación: apertura, ventana de 2 h, envío,
 * error y resultado. Devuelve ya resuelto qué pintar (`showHint`,
 * `showConfirm`) para que el componente no tenga lógica.
 *
 * Al cancelar, la action revalida `/mis-reservas` y la card pasa al
 * historial, así que este componente se desmonta casi a la vez. El
 * resultado (qué pasa con el dinero) se anuncia en el aviso de página
 * (`ReviewFeedback`), que sobrevive al refresco. Si el diálogo se
 * renderiza sin ese contexto (tests), el resultado se queda dentro.
 *
 * La ventana se vigila con el reloj del navegador: una pestaña abierta
 * mucho rato deja de ofrecer cancelar al cruzar las 2 h. Con el diálogo
 * ya abierto no se cierra de golpe; el servidor rechazará con su motivo.
 */
export function useCancelBookingDialog({
  bookingId,
  amountLabel,
  startAtIso,
  enforceWindow,
}: UseCancelBookingDialogArgs) {
  const locale = useLocale();
  const t = useTranslations('customerArea.cancelDialog');
  const announce = useReviewFeedback();
  // Con `null` el hook no vigila nada y deja la cancelación abierta.
  const cancellable = useCancellationWindow(enforceWindow ? startAtIso : null, true);
  const [open, setOpen] = useState(false);
  const [errorCode, setErrorCode] = useState<CancelMyBookingErrorCode | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const changeOpen = useCallback((next: boolean) => {
    // Cada apertura empieza limpia: un error viejo puede haber dejado de aplicar.
    if (!next) setErrorCode(null);
    setOpen(next);
  }, []);

  const confirm = useCallback(() => {
    setErrorCode(null);
    startTransition(async () => {
      const result = await cancelMyBookingAction(locale, { bookingId });
      if (!result.ok) {
        setErrorCode(result.code);
        return;
      }
      const message = t(`result.${result.refund}`, { amount: amountLabel });
      if (announce) {
        announce(message);
        setOpen(false);
        return;
      }
      setResultMessage(message);
    });
  }, [amountLabel, announce, bookingId, locale, t]);

  return {
    open,
    changeOpen,
    errorCode,
    resultMessage,
    isPending,
    confirm,
    /** Ya no se puede cancelar: se pinta el motivo en vez del botón. */
    showHint: !cancellable && !open,
    /** Tras cancelar con éxito solo queda cerrar. */
    showConfirm: resultMessage === null,
  };
}
