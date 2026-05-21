'use client';

import { ChevronRight, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  formatPriceCents,
  groupServicesByRootCategory,
  useServiceSheet,
} from './ProviderServicesList.logic';
import { providerServicesListStyles as s } from './ProviderServicesList.styles';
import type {
  ProviderServicesListProps,
  ServiceGroup,
  SupportedLocale,
} from './ProviderServicesList.types';
import { ServiceDetailSheet } from './ServiceDetailSheet';

/**
 * Lista de servicios de un proveedor agrupada por categoría raíz.
 *
 * Client Component porque cada tarjeta es interactiva: al hacer click
 * abre un sheet con los detalles del servicio. Aunque el flujo de
 * reserva real aún no existe, esto permite al usuario "seleccionar"
 * cada servicio y revisar sus detalles antes de continuar.
 *
 * Renderiza su propio `<h2>` con `id="provider-services-heading"` para
 * que el compositor `ProviderDetail` lo referencie vía `aria-labelledby`
 * sin duplicar el título en pantalla.
 *
 * @param services — servicios a renderizar.
 * @param locale — locale activo (`es` o `ca`).
 */
export function ProviderServicesList({ services, locale }: ProviderServicesListProps) {
  const t = useTranslations('providerDetail.services');
  const { selectedService, isOpen, openWith, setOpen } = useServiceSheet();

  const groups = groupServicesByRootCategory(services);
  // Fallback localizado para servicios sin categoría raíz resuelta.
  const fallbackCategoryName = locale === 'ca' ? 'Altres' : 'Otros';

  return (
    <section className={s.root} data-component="provider-services-list">
      <header className={s.sectionHeader}>
        <h2 id="provider-services-heading" className={s.sectionTitle}>
          {t('title')}
        </h2>
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
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => openWith(service)}
                    className={s.item}
                    aria-haspopup="dialog"
                    aria-label={`${service.name[locale]} · ${formatPriceCents(service.priceCents, locale)}`}
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
                      <span className={s.itemHintRow} aria-hidden>
                        {t('cardHint')}
                        <ChevronRight className={s.itemHintIcon} aria-hidden />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}

      <ServiceDetailSheet
        service={selectedService}
        open={isOpen}
        onOpenChange={setOpen}
        locale={locale}
      />
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
