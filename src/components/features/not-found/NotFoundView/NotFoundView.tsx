import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { notFoundViewStyles as s } from './NotFoundView.styles';

/**
 * Vista de la página 404 personalizada de Beauly.
 *
 * Server Component puramente presentacional: lee las traducciones del
 * namespace `notFound` y compone una tarjeta editorial con un emoji
 * decorativo, eyebrow con el código de error, título, subtítulo y dos
 * CTAs (inicio + buscar). Mantiene el tono cálido de marca para que un
 * error no se sienta como un muro frío.
 */
export function NotFoundView() {
  const t = useTranslations('notFound');

  return (
    <div className={s.root} data-component="not-found-view">
      <div className={s.card}>
        {/* Ilustración mínima: emoji oculto a tecnologías de asistencia
            porque su significado ya lo cubren el eyebrow y el título. */}
        <span className={s.illustration} role="img" aria-label={t('illustrationAlt')}>
          ✨
        </span>

        <span className={s.eyebrow} data-component="not-found-view-eyebrow">
          {t('eyebrow')}
        </span>

        <h1 className={s.title} data-component="not-found-view-title">
          {t('title')}
        </h1>

        <p className={s.subtitle}>{t('subtitle')}</p>

        <div className={s.actions} data-component="not-found-view-actions">
          <Link href="/" className={s.primaryCta} data-component="not-found-view-back-home">
            {t('backHome')}
          </Link>
          <Link
            href="/buscar"
            className={s.secondaryCta}
            data-component="not-found-view-explore-services"
          >
            {t('exploreServices')}
          </Link>
        </div>

        <p className={s.helpHint}>{t('helpHint')}</p>
      </div>
    </div>
  );
}
