'use client';

import { Clock, Tag, User, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';

import { Link } from '@/i18n/navigation';

import { formatPriceCents } from './ProviderServicesList.logic';
import { serviceDetailSheetStyles as s } from './ServiceDetailSheet.styles';
import type { ServiceDetailSheetProps } from './ProviderServicesList.types';

/**
 * Sheet de detalle de servicio.
 *
 * Implementado con Radix Dialog (que es la base del patrón "Sheet"
 * de shadcn). En móvil se presenta como bottom-sheet (slide-up) y
 * en desktop como panel lateral derecho (slide-from-right).
 *
 * Permite al usuario "seleccionar" un servicio aunque el flujo real
 * de reserva aún no exista: muestra todos los detalles relevantes y
 * un CTA "Reservar" deshabilitado pero estéticamente cuidado.
 */
export function ServiceDetailSheet({
  service,
  open,
  onOpenChange,
  locale,
  providerSlugWithId,
}: ServiceDetailSheetProps) {
  const t = useTranslations('providerDetail.services.sheet');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} data-component="provider-services-sheet-overlay" />
        <Dialog.Content
          className={s.content}
          data-component="provider-services-sheet"
          aria-describedby={undefined}
        >
          <header className={s.header}>
            <div className={s.titleBlock}>
              <Dialog.Title className={s.title}>{t('title')}</Dialog.Title>
              <Dialog.Description className={s.subtitle}>{t('subtitle')}</Dialog.Description>
            </div>
            <Dialog.Close
              aria-label={t('close')}
              className={s.closeButton}
              data-component="provider-services-sheet-close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </header>

          {service && (
            <div className={s.body}>
              <h3 className={s.serviceName}>{service.name[locale]}</h3>

              <div className={s.metaGrid}>
                <div className={s.metaItem}>
                  <Clock className={s.metaIcon} aria-hidden />
                  <div className={s.metaBody}>
                    <span className={s.metaLabel}>{t('durationLabel')}</span>
                    <span className={s.metaValue}>
                      {service.durationMinutes}
                      {' min'}
                    </span>
                  </div>
                </div>

                <div className={s.metaItem}>
                  <Tag className={s.metaIcon} aria-hidden />
                  <div className={s.metaBody}>
                    <span className={s.metaLabel}>{t('priceLabel')}</span>
                    <span className={s.metaValue}>
                      {formatPriceCents(service.priceCents, locale)}
                    </span>
                  </div>
                </div>

                <div className={`${s.metaItem} sm:col-span-2`}>
                  <User className={s.metaIcon} aria-hidden />
                  <div className={s.metaBody}>
                    <span className={s.metaLabel}>{t('professionalLabel')}</span>
                    <span className={s.metaValue}>{t('anyProfessional')}</span>
                  </div>
                </div>
              </div>

              <div className={s.descriptionBlock}>
                <span className={s.descriptionLabel}>{t('descriptionLabel')}</span>
                <p className={s.descriptionText}>{service.description[locale]}</p>
              </div>

              <p className={s.comingSoonNote}>{t('comingSoonNote')}</p>
            </div>
          )}

          <footer className={s.footer}>
            {service ? (
              <Link
                href={`/centro/${providerSlugWithId}/reservar?serviceId=${service.id}`}
                className={s.reserveCta}
                data-component="provider-services-sheet-reserve"
              >
                {t('reserveCta')}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className={s.reserveCta}
                data-component="provider-services-sheet-reserve"
              >
                {t('reserveCta')}
              </button>
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
