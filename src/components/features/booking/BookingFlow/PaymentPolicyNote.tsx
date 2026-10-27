'use client';

import { useTranslations } from 'next-intl';

import type { AppLocale } from '@/i18n/routing';
import { canCancelBooking } from '@/lib/utils/booking-cancellation';

import { formatCancellationDeadline } from '../BookingSummary/BookingSummary.logic';
import { LastMinuteNotice } from '../LastMinuteNotice';
import { useTickingNow } from '../shared/useTickingNow';

import { paymentPolicyNoteStyles as s } from './PaymentPolicyNote.styles';

interface PaymentPolicyNoteProps {
  /** Última hora según el servidor. */
  isLastMinute: boolean;
  /**
   * `true` si el servidor ha corregido la estimación que el navegador
   * congeló al lanzar el checkout.
   */
  changed: boolean;
  /** Inicio de la reserva tal y como quedó en BD. */
  slotStartIso: string;
  locale: AppLocale;
  /** Instante fijo para tests; en producción el reloj avanza solo. */
  now?: Date;
}

/**
 * Condiciones de cancelación en el paso de pago, según el servidor.
 *
 * El resumen las calculaba con el reloj del navegador; aquí ya existe la
 * reserva y el servidor ha decidido con su propia hora. Si no coinciden,
 * lo decimos de forma explícita (`role="status"`) para que el cambio no
 * pase desapercibido justo antes de pagar.
 *
 * Si el usuario tarda tanto en pagar que la fecha límite de cancelación
 * gratuita ya ha pasado, no enseñamos una fecha pasada: decimos que el
 * plazo ha vencido. Client Component porque vigila ese reloj.
 */
export function PaymentPolicyNote({
  isLastMinute,
  changed,
  slotStartIso,
  locale,
  now,
}: PaymentPolicyNoteProps) {
  const t = useTranslations('booking.payment');
  const tPolicy = useTranslations('booking.policy');
  const current = useTickingNow(now, !isLastMinute);

  // Mismo criterio que la cancelación del proveedor: quedan ≥ 2 h.
  const windowOpen = canCancelBooking(
    { startAt: new Date(slotStartIso), status: 'confirmed' },
    current,
  );

  return (
    <div className={s.root} data-component="booking-payment-policy">
      {changed && (
        <p className={s.changed} role="status" data-component="booking-payment-policy-changed">
          {t('conditionsChanged')}
        </p>
      )}
      {isLastMinute ? (
        <LastMinuteNotice />
      ) : (
        <p className={s.cancelUntil} data-component="booking-payment-policy-cancel">
          {windowOpen
            ? tPolicy('cancelUntil', {
                deadline: formatCancellationDeadline(slotStartIso, locale),
              })
            : tPolicy('cancelWindowPassed')}
        </p>
      )}
    </div>
  );
}
