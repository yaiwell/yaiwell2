import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { forProvidersCtaStyles as s } from './ForProvidersCTA.styles';

/**
 * Email comercial del equipo. Centralizado aquí para que un cambio
 * no obligue a tocar i18n. Si en el futuro queremos formulario propio
 * de contacto, basta con sustituir el `<a href="mailto:...">` por un
 * `<Link href="/contacto">` sin tocar copy.
 */
const SALES_EMAIL = 'hola@yaiwell.es';

/**
 * Banner final de la landing /profesionales.
 *
 * Server Component con dos CTAs: alta directa (primario) y mailto al
 * equipo de ventas (secundario). Cerrar con dos opciones es deliberado
 * aquí: la barrera de "hablar con alguien" reduce fricción en clientes
 * con muchos centros que prefieren onboarding asistido.
 */
export function ForProvidersCTA() {
  const t = useTranslations('forProviders.cta');

  return (
    <section className={s.root} data-component="for-providers-final-cta">
      <div className={s.container}>
        <div className={s.banner}>
          <span className={s.eyebrow}>{t('eyebrow')}</span>
          <h2 className={s.title}>{t('title')}</h2>
          <p className={s.subtitle}>{t('subtitle')}</p>
          <div className={s.actions}>
            <Link
              href="/registro?as=provider"
              className={s.ctaPrimary}
              data-component="for-providers-final-cta-primary"
            >
              {t('primary')}
            </Link>
            {/* `mailto:` es válido aquí porque no es navegación interna;
                no se usa el Link de next-intl. */}
            <a
              href={`mailto:${SALES_EMAIL}`}
              className={s.ctaSecondary}
              data-component="for-providers-final-cta-secondary"
            >
              {t('secondary')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
