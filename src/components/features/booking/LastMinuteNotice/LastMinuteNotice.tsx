import { Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { lastMinuteNotice, lastMinuteNoticeStyles as s } from './LastMinuteNotice.styles';
import type { LastMinuteNoticeProps } from './LastMinuteNotice.types';

/**
 * Aviso de reserva de última hora (empieza en menos de 2 h): se paga
 * ahora y no admite cancelación ni reembolso.
 *
 * Puramente presentacional: quien lo monta decide si el hueco es de
 * última hora (`isLastMinuteBooking`). `role="status"` hace que el
 * lector de pantalla lo anuncie sin interrumpir cuando aparece al
 * cambiar de hueco o de paso; un `alert` sería desproporcionado para
 * una condición, no un error.
 *
 * Sin `'use client'`: no tiene estado ni efectos y `useTranslations`
 * funciona también en Server Components.
 */
export function LastMinuteNotice({ variant = 'policy', id }: LastMinuteNoticeProps) {
  const t = useTranslations('booking.lastMinute');
  const isCompact = variant === 'compact';

  return (
    <div
      id={id}
      role="status"
      className={lastMinuteNotice({ variant })}
      data-component={`booking-last-minute-${variant}`}
    >
      <Zap className={isCompact ? s.iconCompact : s.icon} aria-hidden />
      <p className={isCompact ? undefined : s.text}>
        {isCompact ? t('nonRefundable') : t('policy')}
      </p>
    </div>
  );
}
