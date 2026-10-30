'use client';

import { CalendarX2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PaymentPolicyNote } from '../BookingFlow/PaymentPolicyNote';
import { DiscountedPrice } from '../DiscountedPrice';

import { OnsiteConfirmError } from './OnsiteConfirmError';
import { onsiteConfirmPanelStyles as s } from './OnsiteConfirmPanel.styles';
import type { OnsiteConfirmPanelProps } from './OnsiteConfirmPanel.types';

/**
 * Último paso de una reserva con pago en el local (§4.bis, decidido
 * 2026-10-29): importe a pagar en el negocio, cancelación sin cargo hasta
 * 2 h antes y el aviso de lo que supone no presentarse. La reserva no se
 * crea hasta pulsar «Confirmar reserva»: nace `confirmed`, sin cobro.
 *
 * Client Component: el botón y el estado de la creación vienen del flujo.
 */
export function OnsiteConfirmPanel({
  price,
  slotStartIso,
  locale,
  state,
  redirectUrl,
  onConfirm,
  onChooseAnotherSlot,
  onPayOnline,
}: OnsiteConfirmPanelProps) {
  const t = useTranslations('booking.onsite');

  if (state.status === 'error') {
    return (
      <OnsiteConfirmError
        error={state.error}
        locale={locale}
        redirectUrl={redirectUrl}
        onRetry={onConfirm}
        onChooseAnotherSlot={onChooseAnotherSlot}
        onPayOnline={onPayOnline}
      />
    );
  }

  const creating = state.status === 'creating' || state.status === 'done';

  return (
    <div className={s.root} data-component="booking-onsite-confirm">
      <div className={s.amountRow}>
        <span className={s.amountLabel}>{t('amountLabel')}</span>
        <DiscountedPrice
          amountCents={price.amountCents}
          originalPriceCents={price.originalPriceCents}
          discountPct={price.discountPct}
          locale={locale}
          size="lg"
          dataComponent="booking-onsite-amount"
        />
      </div>

      <PaymentPolicyNote
        isLastMinute={false}
        changed={false}
        slotStartIso={slotStartIso}
        locale={locale}
        paymentMode="onsite"
      />

      <p className={s.noShowNotice} data-component="booking-onsite-no-show-notice">
        <CalendarX2 className={s.noShowIcon} aria-hidden />
        {t('noShowNotice')}
      </p>

      <button
        type="button"
        className={s.confirmButton}
        onClick={onConfirm}
        disabled={creating}
        aria-busy={creating}
        data-component="booking-onsite-confirm-button"
      >
        {creating && <span className={s.spinner} aria-hidden />}
        {creating ? t('confirming') : t('confirm')}
      </button>
      <p className={s.payAtVenueNote}>{t('payAtVenueNote')}</p>
    </div>
  );
}
