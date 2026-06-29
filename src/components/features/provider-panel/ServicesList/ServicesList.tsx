import { Clock, Plus, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

import { formatCurrencyFromCents } from '../DashboardMetrics/DashboardMetrics.logic';
import { ServiceDeleteButton } from './ServiceDeleteButton';
import { ServiceToggleButton } from './ServiceToggleButton';
import { servicesListStyles as s } from './ServicesList.styles';
import type { ServicesListProps } from './ServicesList.types';

/**
 * Listado de servicios del proveedor para el panel.
 *
 * Server Component puro: recibe la colección y la renderiza con el
 * estado visual (activo/pausado), métricas básicas y CTAs mock.
 *
 * Las acciones secundarias (editar, pausar, reactivar) no están
 * cableadas todavía — se conectarán cuando exista API real de servicios.
 */
export function ServicesList({ services, locale }: ServicesListProps) {
  const t = useTranslations('providerPanel.services');

  return (
    <section className={s.root} data-component="services-list">
      <header className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.title}>{t('title')}</h1>
          <p className={s.subtitle}>{t('subtitle')}</p>
        </div>
        <Button asChild size="lg" data-component="services-list-add-cta">
          <Link href="/panel/servicios/nuevo">
            <Plus className="size-4" aria-hidden />
            {t('addCta')}
          </Link>
        </Button>
      </header>

      {services.length === 0 ? (
        <div className={s.empty} data-component="services-list-empty">
          {t('empty')}
        </div>
      ) : (
        <ul className={s.list}>
          {services.map((service) => {
            const isActive = service.status === 'active';
            const statusClass = isActive ? s.cardStatusActive : s.cardStatusPaused;

            return (
              <li
                key={service.id}
                className={s.card}
                data-component={`services-list-item-${service.id}`}
                data-status={service.status}
              >
                <div className={s.cardMain}>
                  <div className={s.cardHeader}>
                    <h2 className={s.cardName}>{service.name[locale]}</h2>
                    <span className={s.cardCategoryChip}>{service.categoryLabel[locale]}</span>
                    <span className={statusClass}>{t(`status.${service.status}`)}</span>
                  </div>
                  <p className={s.cardDescription}>{service.description[locale]}</p>
                  <div className={s.cardMeta}>
                    <span className="inline-flex items-center gap-1">
                      <Clock className={s.cardMetaIcon} aria-hidden />
                      {t('duration', { minutes: service.durationMinutes })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className={s.cardMetaIcon} aria-hidden />
                      {t('bookings30d', { count: service.bookingsLast30Days })}
                    </span>
                  </div>
                </div>

                <div className={s.cardAside}>
                  <span className={s.cardPrice}>
                    {formatCurrencyFromCents(service.priceCents, locale)}
                  </span>
                  <div className={s.cardActions}>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/panel/servicios/${service.id}/editar`}
                        data-component={`services-list-edit-${service.id}`}
                      >
                        {t('edit')}
                      </Link>
                    </Button>
                    <ServiceToggleButton
                      locale={locale}
                      serviceId={service.id}
                      isActive={isActive}
                      pauseLabel={t('pause')}
                      resumeLabel={t('resume')}
                      pendingLabel={t('updating')}
                    />
                    <ServiceDeleteButton locale={locale} serviceId={service.id} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
