import { CalendarClock, Clock, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { formatPriceCents } from './ServiceDetail.logic';
import { serviceDetailStyles as s } from './ServiceDetail.styles';
import type { ServiceDetailProps } from './ServiceDetail.types';

/**
 * Ficha pública de un servicio dentro de un proveedor.
 *
 * Server Component puramente presentacional: recibe el proveedor, el
 * servicio y los datos de profesional/CTA ya resueltos por la página,
 * y los renderiza con la estética cálida del marketplace.
 *
 * Estructura visual:
 *  1. Breadcrumb (Inicio › Buscar › Centro › Servicio).
 *  2. Cabecera (eyebrow + nombre + enlace al centro).
 *  3. Profesional asignado (mock visual en Fase 0).
 *  4. Descripción larga.
 *  5. Cláusulas / política breve (cancelación 2h, puntualidad, pago).
 *  6. Panel lateral sticky con duración, precio y CTA "Reservar".
 */
export function ServiceDetail({
  provider,
  service,
  professional,
  locale,
  reserveHref,
  providerSlugWithId,
}: ServiceDetailProps) {
  const t = useTranslations('serviceDetail');
  const tBreadcrumb = useTranslations('serviceDetail.breadcrumb');

  const formattedPrice = formatPriceCents(service.priceCents, locale);

  return (
    <main className={s.root} data-component="service-detail-page">
      <nav
        aria-label={tBreadcrumb('home')}
        className={s.breadcrumb}
        data-component="service-detail-breadcrumb"
      >
        <ol className={s.breadcrumbList}>
          <li className={`${s.breadcrumbItem} hidden sm:inline-flex`}>
            <Link href="/" className={s.breadcrumbLink}>
              {tBreadcrumb('home')}
            </Link>
            <span className={s.breadcrumbSeparator} aria-hidden>
              ›
            </span>
          </li>
          <li className={s.breadcrumbItem}>
            <Link href="/buscar" className={s.breadcrumbLink}>
              {tBreadcrumb('search')}
            </Link>
            <span className={s.breadcrumbSeparator} aria-hidden>
              ›
            </span>
          </li>
          <li className={s.breadcrumbItem}>
            <Link href={`/centro/${providerSlugWithId}`} className={s.breadcrumbLink}>
              {provider.name}
            </Link>
            <span className={s.breadcrumbSeparator} aria-hidden>
              ›
            </span>
          </li>
          <li className={`${s.breadcrumbItem} ${s.breadcrumbCurrent}`} aria-current="page">
            {service.name[locale]}
          </li>
        </ol>
      </nav>

      <header className={s.header} data-component="service-detail-header">
        <span className={s.eyebrow}>{t('header.eyebrow')}</span>
        <h1 className={s.title} data-component="service-detail-title">
          {service.name[locale]}
        </h1>
        <p className={s.providerLine}>
          <Link
            href={`/centro/${providerSlugWithId}`}
            className={s.providerLink}
            data-component="service-detail-provider-link"
          >
            {provider.name}
          </Link>
        </p>
      </header>

      <div className={s.body}>
        <div className={s.mainCol}>
          {/* Tarjeta de profesional asignado: usamos la foto del centro
              como fallback decorativo cuando no hay profesional concreto;
              la UI deja claro con el copy que "cualquier profesional" del
              centro atenderá el servicio en ese caso. */}
          <section
            className={s.professionalCard}
            aria-label={t('header.professionalLabel')}
            data-component="service-detail-professional"
          >
            <div className={s.professionalAvatar}>
              {professional ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={professional.photoUrl}
                  alt={t('header.professionalPhotoAlt', { name: professional.name })}
                  className={s.professionalAvatarImg}
                />
              ) : (
                <span className={s.professionalAvatarFallback} aria-hidden>
                  {provider.name.charAt(0)}
                </span>
              )}
            </div>
            <div className={s.professionalInfo}>
              <span className={s.professionalLabel}>{t('header.professionalLabel')}</span>
              <span className={s.professionalName}>
                {professional ? professional.name : t('header.anyProfessional')}
              </span>
              {professional && <span className={s.professionalRole}>{professional.role}</span>}
            </div>
          </section>

          <section className={s.section} data-component="service-detail-description">
            <h2 className={s.sectionTitle}>{t('description.title')}</h2>
            <p className={s.descriptionText}>{service.description[locale]}</p>
          </section>

          <section className={s.section} data-component="service-detail-policy">
            <h2 className={s.sectionTitle}>{t('policy.title')}</h2>
            <ul className={s.policyList}>
              <li className={s.policyItem} data-component="service-detail-policy-cancellation">
                <span className={s.policyIconWrapper} aria-hidden>
                  <ShieldCheck className={s.policyIcon} />
                </span>
                <div className={s.policyBody}>
                  <span className={s.policyItemTitle}>{t('policy.cancellationTitle')}</span>
                  <span className={s.policyItemText}>{t('policy.cancellationBody')}</span>
                </div>
              </li>
              <li className={s.policyItem} data-component="service-detail-policy-punctuality">
                <span className={s.policyIconWrapper} aria-hidden>
                  <CalendarClock className={s.policyIcon} />
                </span>
                <div className={s.policyBody}>
                  <span className={s.policyItemTitle}>{t('policy.punctualityTitle')}</span>
                  <span className={s.policyItemText}>{t('policy.punctualityBody')}</span>
                </div>
              </li>
              <li className={s.policyItem} data-component="service-detail-policy-payment">
                <span className={s.policyIconWrapper} aria-hidden>
                  <Clock className={s.policyIcon} />
                </span>
                <div className={s.policyBody}>
                  <span className={s.policyItemTitle}>{t('policy.paymentTitle')}</span>
                  <span className={s.policyItemText}>{t('policy.paymentBody')}</span>
                </div>
              </li>
            </ul>
            <p className={s.policyRatingHint}>{t('policy.ratingHint')}</p>
          </section>
        </div>

        <aside className={s.asideCol}>
          <div className={s.asideCard} data-component="service-detail-cta-panel">
            <div className={s.asideMetaRow}>
              <div className={s.asideMetaItem}>
                <span className={s.asideMetaLabel}>{t('header.durationLabel')}</span>
                <span className={s.asideMetaValue}>{`${service.durationMinutes} min`}</span>
              </div>
              <div className={s.asideMetaItem}>
                <span className={s.asideMetaLabel}>{t('header.priceLabel')}</span>
                <span className={s.asidePriceValue}>{formattedPrice}</span>
              </div>
            </div>
            <div className={s.asideDivider} aria-hidden />
            <Link
              href={reserveHref}
              className={s.reserveCta}
              data-component="service-detail-reserve-cta"
            >
              {t('cta.reserve')}
            </Link>
            <p className={s.reserveNote}>{t('cta.secureNote')}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
