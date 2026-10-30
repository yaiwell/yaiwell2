import { CreditCard } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

// `availability.client` va por import directo (client-safe), nunca por el
// barrel de availability.
import type { AppLocale } from '@/i18n/routing';
import { toIntlLocale } from '@/lib/i18n';
import { BUSINESS_TIMEZONE } from '@/lib/services/availability/availability.client';
import { formatShortDayMonth } from '@/lib/utils/short-date';

import { onsiteRestrictionNoticeStyles as s } from './OnsiteRestrictionNotice.styles';

interface OnsiteRestrictionNoticeProps {
  /** Fin del bloqueo «solo online», calculado en el servidor. */
  until: Date;
}

/**
 * Aviso de bloqueo activo en `/mis-reservas` (§4.bis): tras 3 ausencias
 * sin cancelar en 12 meses, durante 3 meses solo se puede reservar
 * pagando online. Dice hasta cuándo, para que no lo descubra al reservar.
 *
 * Server Component: solo texto derivado de la prop.
 */
export function OnsiteRestrictionNotice({ until }: OnsiteRestrictionNoticeProps) {
  const t = useTranslations('customerArea.onsiteRestriction');
  const locale = useLocale() as AppLocale;
  const date = formatShortDayMonth(until, toIntlLocale(locale), BUSINESS_TIMEZONE);

  return (
    <section className={s.root} role="status" data-component="customer-onsite-restriction">
      <CreditCard className={s.icon} aria-hidden="true" />
      <div className={s.body}>
        <p className={s.title}>{t('title')}</p>
        <p className={s.text}>{t('body', { date })}</p>
      </div>
    </section>
  );
}
