import { ArrowRight, CalendarCheck2, Scissors, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { forProvidersHeroStyles as s } from './ForProvidersHero.styles';
import type { ForProvidersHeroProps } from './ForProvidersHero.types';

/**
 * Hero de la landing comercial /profesionales.
 *
 * Server Component (sin estado, sin eventos). Compone:
 *  - Columna textual: eyebrow + h1 con segunda línea acentuada (Fraunces
 *    italic vía `font-display`) + subtítulo + dos CTAs.
 *  - Columna visual: mockup decorativo del panel de proveedor con datos
 *    de marca traducidos. No usamos imagen real para que el degradado
 *    funcione en light/dark con los semantic tokens.
 *
 * Decisión: el CTA primario lleva a `/registro?as=provider` y el
 * secundario hace anchor scroll a `#beneficios` para que el visitante
 * pueda explorar la propuesta antes de registrarse.
 */
export function ForProvidersHero({ benefitsAnchor = '#beneficios' }: ForProvidersHeroProps = {}) {
  const t = useTranslations('forProviders.hero');

  return (
    <section className={s.root} data-component="for-providers-hero">
      {/* Capas decorativas de fondo. `aria-hidden` para que lectores
          de pantalla ignoren los elementos puramente visuales. */}
      <div className={s.bgLayer} aria-hidden="true" />
      <div className={s.bgGlow} aria-hidden="true" />

      <div className={s.container}>
        <div className={s.textCol}>
          <span className={s.eyebrow}>
            <span className={s.eyebrowDot} aria-hidden="true" />
            {t('eyebrow')}
          </span>

          <h1 className={s.title}>
            {t('titleLine1')} <span className={s.titleAccent}>{t('titleLine2')}</span>
          </h1>

          <p className={s.subtitle}>{t('subtitle')}</p>

          <div className={s.ctaGroup}>
            <Link
              href="/registro?as=provider"
              className={s.ctaPrimary}
              data-component="for-providers-hero-cta-primary"
            >
              {t('ctaPrimary')}
              <ArrowRight className="ml-1 size-4" aria-hidden="true" />
            </Link>
            <a
              href={benefitsAnchor}
              className={s.ctaSecondary}
              data-component="for-providers-hero-cta-secondary"
            >
              {t('ctaSecondary')}
            </a>
          </div>

          <p className={s.trustNote}>{t('trustNote')}</p>
        </div>

        {/* Mockup decorativo. Toda la composición vive con semantic
            tokens, por lo que en dark cambia de paleta automáticamente. */}
        <div className={s.mockCol} aria-hidden="true">
          <div className={s.mockFloat} />
          <div className={s.mockFloat2} />
          <div className={s.mockFrame} data-component="for-providers-hero-mock">
            <span className={s.mockBadge}>
              <span className={s.mockBadgeDot} />
              {t('mockBadge')}
            </span>

            <div className={s.mockBookingRow}>
              <div className={s.mockBookingLeft}>
                <span className={s.mockAvatar}>
                  <Scissors className="size-5" />
                </span>
                <span className={s.mockBookingTexts}>
                  <span className={s.mockBookingService}>{t('mockBookingService')}</span>
                  <span className={s.mockBookingClient}>{t('mockBookingClient')}</span>
                </span>
              </div>
              <span className={s.mockBookingStatus}>
                <CalendarCheck2 className="mr-1 inline size-3" />
                {t('mockBookingStatus')}
              </span>
            </div>

            <div className={s.mockMetricRow}>
              <span className={s.mockMetricLabel}>{t('mockOccupancyLabel')}</span>
              <span className={s.mockMetricValue}>{t('mockOccupancyValue')}</span>
            </div>
            <div className={s.mockBarTrack}>
              <div className={s.mockBarFill}>
                <Sparkles className="sr-only" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
