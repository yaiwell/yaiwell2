import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import {
  formatCommissionRate,
  formatMonthlyPrice,
  PLAN_PRESENTATION,
} from './ForProvidersPricing.logic';
import { forProvidersPricingStyles as s } from './ForProvidersPricing.styles';
import type { ForProvidersPricingProps } from './ForProvidersPricing.types';

/**
 * Sección de precios para proveedores.
 *
 * Server Component puramente presentacional: recibe los planes ya
 * leídos de la tabla `Plan` (ver `plans.service.ts`) y solo los
 * formatea. Las cifras dejaron de estar hardcodeadas el 2026-09-23:
 * publicábamos 12/9/6/4 % mientras el seed —y por tanto el
 * `application_fee_amount` de Stripe— cobraba 12/10/8/6 %.
 *
 * Nombres, taglines y features siguen en i18n: son copy, no dato.
 * Cada card lleva su propio CTA que pasa el tier por query string
 * para preseleccionarlo en `/registro`.
 */
export function ForProvidersPricing({ plans }: ForProvidersPricingProps) {
  const t = useTranslations('forProviders.pricing');
  const locale = useLocale();

  // Defensa: sin planes no hay sección. La page ya filtra este caso,
  // pero preferimos que el componente nunca pueda pintar una tarjeta
  // sin tarifa real.
  if (plans.length === 0) return null;

  return (
    <section
      id="planes"
      className={s.root}
      data-component="for-providers-pricing"
      aria-labelledby="for-providers-pricing-title"
    >
      <div className={s.container}>
        <header className={s.header}>
          <span className={s.eyebrow}>{t('eyebrow')}</span>
          <h2 id="for-providers-pricing-title" className={s.title}>
            {t('title')}
          </h2>
          <p className={s.subtitle}>{t('subtitle')}</p>
        </header>

        <div className={s.grid}>
          {plans.map((plan) => {
            const presentation = PLAN_PRESENTATION[plan.tier];
            const cardClass = presentation.popular ? s.cardPopular : s.card;

            return (
              <article
                key={plan.tier}
                className={cardClass}
                data-component={`for-providers-plan-${plan.tier}`}
              >
                {presentation.popular && (
                  <span className={s.popularBadge}>{t('popularBadge')}</span>
                )}

                <header className="flex flex-col gap-1.5">
                  <h3 className={s.planName}>{t(`plans.${plan.tier}.name`)}</h3>
                  <p className={s.planTagline}>{t(`plans.${plan.tier}.tagline`)}</p>
                </header>

                <div className="flex flex-col gap-2">
                  <div className={s.priceRow}>
                    <span className={s.priceCurrency}>€</span>
                    <span className={s.priceValue} data-component="for-providers-plan-price">
                      {formatMonthlyPrice(plan.monthlyPriceCents, locale)}
                    </span>
                    <span className={s.priceSuffix}>{t('perMonth')}</span>
                  </div>
                  <span className={s.commission} data-component="for-providers-plan-commission">
                    {t('commission', {
                      rate: formatCommissionRate(plan.commissionRateBps, locale),
                    })}
                  </span>
                </div>

                <ul className={s.features}>
                  {presentation.featureKeys.map((key) => (
                    <li key={key} className={s.feature}>
                      <Check className={s.checkIcon} aria-hidden="true" />
                      <span>{t(`plans.${plan.tier}.${key}`)}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/registro?as=provider&plan=${plan.tier}`}
                  className={presentation.popular ? s.cta : s.ctaGhost}
                  data-component={`for-providers-plan-cta-${plan.tier}`}
                >
                  {t('ctaStart')}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
