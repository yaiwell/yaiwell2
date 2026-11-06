import { ArrowRight, Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { FounderPromoAvailability } from '@/lib/services/billing';

import { forProvidersFounderPromoStyles as s } from './ForProvidersFounderPromo.styles';

interface ForProvidersFounderPromoProps {
  availability: FounderPromoAvailability;
}

/**
 * Aviso del año de Premium de regalo en Mallorca, con las plazas reales. Lleva
 * al alta en Gratis: la plaza se da al aprobar el negocio, no se compra nada.
 */
export function ForProvidersFounderPromo({ availability }: ForProvidersFounderPromoProps) {
  const t = useTranslations('forProviders.founderPromo');

  return (
    <section className={s.root} data-component="for-providers-founder-promo">
      <div className={s.card}>
        <span className={s.eyebrow}>
          <Gift className="size-4" aria-hidden="true" />
          {t('eyebrow')}
        </span>
        <h2 className={s.title}>{t('title', { total: availability.total })}</h2>
        <p className={s.body}>{t('body')}</p>
        <p className={s.remaining} data-component="founder-promo-remaining">
          {t('remaining', { remaining: availability.remaining })}
        </p>
        <Link href="/registro?as=provider&plan=free" className={s.cta}>
          {t('cta')}
          <ArrowRight className="ml-1 size-4" aria-hidden="true" />
        </Link>
        <p className={s.conditions}>{t('conditions')}</p>
      </div>
    </section>
  );
}
