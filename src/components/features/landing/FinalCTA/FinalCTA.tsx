import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { finalCtaStyles as s } from './FinalCTA.styles';

/**
 * Llamada a la acción final de la landing.
 *
 * Banner cálido con un único botón hacia `/buscar`. Cerrar con un CTA
 * único (no varios) es deliberado: cada opción extra diluye la conversión.
 */
export function FinalCTA() {
  const t = useTranslations('home.finalCta');

  return (
    <section className={s.root}>
      <div className={s.container}>
        <div className={s.banner}>
          <h2 className={s.title}>{t('title')}</h2>
          <p className={s.subtitle}>{t('subtitle')}</p>
          <Link href="/buscar" className={s.button}>
            {t('button')}
          </Link>
        </div>
      </div>
    </section>
  );
}
