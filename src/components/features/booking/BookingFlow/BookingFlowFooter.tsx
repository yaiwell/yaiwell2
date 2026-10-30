'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { bookingFlowStyles as s } from './BookingFlow.styles';
import type { BookingPaymentMethod, BookingStep } from './BookingFlow.types';

interface BookingFlowFooterProps {
  step: BookingStep;
  isFirstStep: boolean;
  canAdvance: boolean;
  /** Método efectivo: decide si el resumen lleva «al pago» o solo «continuar». */
  paymentMethod: BookingPaymentMethod;
  providerSlugWithId: string;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Pie de navegación del flujo de reserva: volver (o salir en el primer
 * paso) y avanzar. En el paso de pago el avance lo da el propio panel
 * (pagar o confirmar la reserva en el local), así que no hay botón.
 */
export function BookingFlowFooter({
  step,
  isFirstStep,
  canAdvance,
  paymentMethod,
  providerSlugWithId,
  onBack,
  onNext,
}: BookingFlowFooterProps) {
  const t = useTranslations('booking.flow');
  const goesToPayment = step === 'summary' && paymentMethod === 'online';

  return (
    <footer className={s.footer}>
      {isFirstStep ? (
        <Link
          href={`/centro/${providerSlugWithId}`}
          className={s.backButton}
          data-component="booking-flow-cancel"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('cancel')}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onBack}
          className={s.backButton}
          data-component="booking-flow-back"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('back')}
        </button>
      )}

      {step !== 'payment' && (
        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance}
          className={s.primaryButton}
          data-component="booking-flow-next"
        >
          {goesToPayment ? t('goToPayment') : t('continue')}
        </button>
      )}
    </footer>
  );
}
