import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { formatPriceCents, groupServicesByRootCategory } from './ProviderServicesList.logic';
import { providerServicesListStyles as s } from './ProviderServicesList.styles';
import type {
  ProviderServicesListProps,
  ServiceGroup,
  SupportedLocale,
} from './ProviderServicesList.types';

/**
 * Lista de servicios de un proveedor agrupada por categoría raíz.
 *
 * Server Component puro: sin estado, sin eventos. Recibe los servicios
 * ya ordenados por precio ascendente (responsabilidad del repositorio)
 * y los agrupa por la categoría raíz a la que pertenecen.
 *
 * El CTA "Reservar" está deshabilitado en MVP visual: aún no existe el
 * flujo de booking real. Mostramos el texto "Próximamente" como label
 * del propio botón (en lugar de una segunda línea muted) por dos
 * motivos:
 * - en móvil queda más compacto y no fragmenta la columna derecha;
 * - el screen reader anuncia un único elemento con su estado disabled,
 *   evitando confusiones tipo "botón Reservar — Próximamente".
 *   Conservamos `aria-label` con "Reservar" para que el botón siga
 *   describiendo su acción real cuando llegue el momento de habilitarlo.
 *
 * @param services — servicios a renderizar.
 * @param locale — locale activo (`es` o `ca`).
 */
export function ProviderServicesList({ services, locale }: ProviderServicesListProps) {
  const t = useTranslations('providerDetail.services');

  const groups = groupServicesByRootCategory(services);
  // Fallback localizado para servicios sin categoría raíz resuelta.
  const fallbackCategoryName = locale === 'ca' ? 'Altres' : 'Otros';

  return (
    <section className={s.root} data-component="provider-services-list">
      <header className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>{t('title')}</h2>
        <p className={s.sectionSubtitle}>{t('subtitle')}</p>
      </header>

      {services.length === 0 ? (
        <div className={s.empty} data-component="provider-services-list-empty">
          {t('empty')}
        </div>
      ) : (
        groups.map((group) => {
          const groupSlug = getGroupSlug(group);
          const categoryName = group.rootCategory
            ? group.rootCategory.name[locale]
            : fallbackCategoryName;

          return (
            <div
              key={groupSlug}
              className={s.group}
              data-component={`provider-services-list-group-${groupSlug}`}
            >
              <h3 className={s.groupHeader}>{t('groupHeader', { category: categoryName })}</h3>

              <div className={s.groupCard}>
                {group.services.map((service) => (
                  <article
                    key={service.id}
                    className={s.item}
                    data-component={`provider-services-list-item-${service.id}`}
                  >
                    <div className={s.itemInfo}>
                      <h4 className={s.itemName}>{service.name[locale]}</h4>
                      <p className={s.itemDescription}>{service.description[locale]}</p>
                      <p className={s.itemMeta}>
                        <Clock className={s.itemMetaIcon} aria-hidden />
                        {t('duration', { minutes: service.durationMinutes })}
                      </p>
                    </div>

                    <div className={s.itemActions}>
                      <span className={s.itemPrice}>
                        {formatPriceCents(service.priceCents, locale)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled
                        aria-disabled="true"
                        aria-label={t('reserve')}
                        data-component={`provider-services-list-reserve-${service.id}`}
                      >
                        {t('reserveComingSoon')}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

/**
 * Devuelve el slug del grupo para los `data-component`.
 * Si no hay categoría raíz, usamos el sentinel "otros" para mantener
 * la convención y evitar colisiones con slugs reales.
 */
function getGroupSlug(group: ServiceGroup): string {
  return group.rootCategory ? group.rootCategory.slug : 'otros';
}

// Re-exportamos el tipo de locale para consumidores externos que ya
// importan desde este archivo; el resto pasa por `index.ts`.
export type { SupportedLocale };
