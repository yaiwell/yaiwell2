import { CalendarClock, HandCoins, PhoneOff, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  forProvidersBenefitsStyles as s,
  forProvidersBenefitsToneStyles,
} from './ForProvidersBenefits.styles';
import type { BenefitItem } from './ForProvidersBenefits.types';

/**
 * Mapa de iconos y tonos por beneficio.
 *
 * Decisión: PhoneOff (no Phone) para "Cero llamadas"; el matiz visual
 * comunica mejor "no hay teléfono". Zap para "reservas en directo"
 * sugiere instantaneidad mejor que un Calendar genérico.
 */
const benefits: BenefitItem[] = [
  { slug: 'liveBookings', icon: Zap, toneIndex: 0 },
  { slug: 'noCalls', icon: PhoneOff, toneIndex: 1 },
  { slug: 'yourHours', icon: CalendarClock, toneIndex: 2 },
  { slug: 'noLockIn', icon: HandCoins, toneIndex: 3 },
];

/**
 * Sección de beneficios para proveedores.
 *
 * Server Component. Renderiza un grid de 4 cards con icono pastel,
 * título y body cortos. La sección lleva `id="beneficios"` para el
 * anchor del CTA secundario del hero.
 */
export function ForProvidersBenefits() {
  const t = useTranslations('forProviders.benefits');

  return (
    <section
      id="beneficios"
      className={s.root}
      data-component="for-providers-benefits"
      aria-labelledby="for-providers-benefits-title"
    >
      <div className={s.container}>
        <header className={s.header}>
          <span className={s.eyebrow}>{t('eyebrow')}</span>
          <h2 id="for-providers-benefits-title" className={s.title}>
            {t('title')}
          </h2>
          <p className={s.subtitle}>{t('subtitle')}</p>
        </header>

        <div className={s.grid}>
          {benefits.map((item) => {
            const Icon = item.icon;
            const tone = forProvidersBenefitsToneStyles[item.toneIndex];
            return (
              <article
                key={item.slug}
                className={s.card}
                data-component={`for-providers-benefit-${item.slug}`}
              >
                <span className={tone} aria-hidden="true">
                  <Icon className="size-5" />
                </span>
                <h3 className={s.cardTitle}>{t(`items.${item.slug}.title`)}</h3>
                <p className={s.cardBody}>{t(`items.${item.slug}.body`)}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
