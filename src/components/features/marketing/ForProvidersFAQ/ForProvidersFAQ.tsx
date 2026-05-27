import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { forProvidersFaqStyles as s } from './ForProvidersFAQ.styles';
import type { FaqSlug } from './ForProvidersFAQ.types';

/**
 * Orden de preguntas mostrado al usuario. Está pensado en embudo:
 * primero las dudas operativas básicas (start, payouts), luego
 * políticas y plataforma. Mantener este orden ayuda a la conversión.
 */
const faqSlugs: FaqSlug[] = [
  'start',
  'payouts',
  'cancel',
  'regret',
  'platform',
  'verification',
];

/**
 * FAQ para proveedores.
 *
 * Server Component que usa `<details>`/`<summary>` para conseguir
 * acordeón accesible sin JavaScript ni Client Component. El chevron
 * rota mediante `group-open:rotate-180`, y los estilos del estado
 * abierto se aplican con la pseudo-clase nativa `:open` (soportada
 * en Chrome, Firefox y Safari modernos).
 */
export function ForProvidersFAQ() {
  const t = useTranslations('forProviders.faq');

  return (
    <section
      id="faq"
      className={s.root}
      data-component="for-providers-faq"
      aria-labelledby="for-providers-faq-title"
    >
      <div className={s.container}>
        <header className={s.header}>
          <span className={s.eyebrow}>{t('eyebrow')}</span>
          <h2 id="for-providers-faq-title" className={s.title}>
            {t('title')}
          </h2>
        </header>

        <div className={s.list}>
          {faqSlugs.map((slug) => (
            <details
              key={slug}
              className={s.item}
              data-component={`for-providers-faq-${slug}`}
            >
              <summary className={s.summary}>
                <span>{t(`items.${slug}.question`)}</span>
                <ChevronDown className={s.chevron} aria-hidden="true" />
              </summary>
              <p className={s.answer}>{t(`items.${slug}.answer`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
