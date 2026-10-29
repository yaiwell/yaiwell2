import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatCommissionRate, formatPlanPrice } from '@/lib/utils/plan-format';
import { isUnlimitedServices } from '@/lib/utils/plan-limits';

import { planCardStyles as s, planCardVariants } from './PlanPicker.styles';
import type { PlanCardProps } from './PlanPicker.types';

/**
 * Tarjeta presentacional de un plan: cuota con IVA incluido, número de
 * servicios y comisión por reserva. Las cifras salen de la tabla `Plan`.
 *
 * Sin estado: la usan el selector del panel (con botón en `footer`) y el
 * paso de plan del onboarding (dentro del `label` de un radio).
 */
export function PlanCard({
  plan,
  locale,
  emphasis = 'none',
  badge = null,
  footer,
  as: Root = 'article',
}: PlanCardProps) {
  const t = useTranslations('providerPanel.plan');
  const isFree = plan.monthlyPriceCents === 0;

  return (
    <Root className={planCardVariants({ emphasis })} data-component={`plan-card-${plan.tier}`}>
      {badge ? <span className={s.badge}>{badge}</span> : null}

      <div className={s.header}>
        <h3 className={s.name}>{t(`tierNames.${plan.tier}`)}</h3>
        <div className={s.priceRow}>
          <span className={s.price}>
            {isFree ? t('card.free') : formatPlanPrice(plan.monthlyPriceCents, locale)}
          </span>
          {isFree ? null : <span className={s.priceSuffix}>{t('card.perMonth')}</span>}
        </div>
        {isFree ? null : <span className={s.vat}>{t('card.vatIncluded')}</span>}
      </div>

      <ul className={s.facts}>
        <li className={s.fact}>
          <Check className={s.factIcon} aria-hidden />
          <span>
            {isUnlimitedServices(plan.maxServices)
              ? t('card.unlimitedServices')
              : t('card.services', { count: plan.maxServices })}
          </span>
        </li>
        <li className={s.fact}>
          <Check className={s.factIcon} aria-hidden />
          <span>
            {t('card.commission', { rate: formatCommissionRate(plan.commissionRateBps, locale) })}
          </span>
        </li>
      </ul>

      {footer}
    </Root>
  );
}
