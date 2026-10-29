import { Clock, Plus, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { pickLocalized } from '@/lib/i18n';

import { formatCurrencyFromCents } from '../DashboardMetrics/DashboardMetrics.logic';
import { PlanLimitNotice } from '../PlanLimitNotice';
import { ServiceDeleteButton } from './ServiceDeleteButton';
import { ServiceToggleButton } from './ServiceToggleButton';
import { getUsageView } from './ServicesList.logic';
import { servicesListStyles as s } from './ServicesList.styles';
import type { ServicesListProps } from './ServicesList.types';

/**
 * Listado de servicios del proveedor para el panel.
 *
 * Server Component puro: recibe la colección y la renderiza con el
 * estado visual (activo/pausado), métricas básicas y CTAs mock.
 *
 * Con `usage` muestra el contador «X/Y publicados» del plan y, si ya
 * está en el límite, el aviso para mejorarlo. Los servicios ocultos por
 * el plan llevan su propia insignia en lugar de «Pausado».
 */
export function ServicesList({ services, locale, usage }: ServicesListProps) {
  const t = useTranslations('providerPanel.services');
  const usageView = usage ? getUsageView(usage) : null;

  return (
    <section className={s.root} data-component="services-list">
      <header className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.title}>{t('title')}</h1>
          <p className={s.subtitle}>{t('subtitle')}</p>
          {usageView ? (
            <p className={s.usageCounter} data-component="services-list-usage">
              {usageView.unlimited
                ? t('planLimit.counterUnlimited', { active: usageView.activeCount })
                : t('planLimit.counter', {
                    active: usageView.activeCount,
                    max: usageView.maxServices,
                  })}
            </p>
          ) : null}
        </div>
        <Button asChild size="lg" data-component="services-list-add-cta">
          <Link href="/panel/servicios/nuevo">
            <Plus className="size-4" aria-hidden />
            {t('addCta')}
          </Link>
        </Button>
      </header>

      {usageView?.atLimit ? <PlanLimitNotice /> : null}

      {services.length === 0 ? (
        <div className={s.empty} data-component="services-list-empty">
          {t('empty')}
        </div>
      ) : (
        <ul className={s.list}>
          {services.map((service) => {
            const isActive = service.status === 'active';
            const statusClass = isActive
              ? s.cardStatusActive
              : service.pausedByPlan
                ? s.cardStatusPausedByPlan
                : s.cardStatusPaused;
            const statusLabel = service.pausedByPlan
              ? t('planLimit.hiddenBadge')
              : t(`status.${service.status}`);

            return (
              <li
                key={service.id}
                className={s.card}
                data-component={`services-list-item-${service.id}`}
                data-status={service.status}
              >
                <div className={s.cardMain}>
                  <div className={s.cardHeader}>
                    <h2 className={s.cardName}>{pickLocalized(service.name, locale)}</h2>
                    <span className={s.cardCategoryChip}>
                      {pickLocalized(service.categoryLabel, locale)}
                    </span>
                    <span className={statusClass}>{statusLabel}</span>
                  </div>
                  <p className={s.cardDescription}>{pickLocalized(service.description, locale)}</p>
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
