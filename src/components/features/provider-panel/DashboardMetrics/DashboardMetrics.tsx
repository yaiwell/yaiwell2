import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { pickLocalized } from '@/lib/i18n';

import {
  computeBarHeightPct,
  formatCurrencyFromCents,
  formatDeltaPct,
  getMaxDailyRevenueCents,
} from './DashboardMetrics.logic';
import { dashboardMetricsStyles as s } from './DashboardMetrics.styles';
import type { DashboardMetricsProps, SupportedLocale } from './DashboardMetrics.types';

/**
 * Bloque principal del dashboard del proveedor: KPIs + gráfica diaria
 * + top servicios.
 *
 * Es un Server Component puro: recibe los datos ya precomputados y solo
 * compone la UI. La gráfica se renderiza con `div`s posicionados como
 * barras (escalado con `computeBarHeightPct`) para evitar añadir
 * dependencias de gráficos al bundle.
 */
export function DashboardMetrics({ metrics, locale }: DashboardMetricsProps) {
  const t = useTranslations('providerPanel.dashboard');
  const tChart = useTranslations('providerPanel.dashboard.chart');
  const maxRevenue = getMaxDailyRevenueCents(metrics);

  return (
    <div className={s.root} data-component="dashboard-metrics">
      <header className={s.header}>
        <h1 className={s.title}>{t('title')}</h1>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      <div className={s.kpiGrid} data-component="dashboard-kpi-grid">
        <KpiCard
          label={t('metrics.weekRevenue')}
          value={formatCurrencyFromCents(metrics.weekRevenueCents, locale)}
          delta={metrics.weekRevenueDeltaPct}
          locale={locale}
          deltaHint={t('metrics.vsLastWeek')}
        />
        <KpiCard
          label={t('metrics.weekBookings')}
          value={String(metrics.weekBookingsCount)}
          delta={metrics.weekBookingsDeltaPct}
          locale={locale}
          deltaHint={t('metrics.vsLastWeek')}
        />
        <KpiCard
          label={t('metrics.averageTicket')}
          value={formatCurrencyFromCents(metrics.averageTicketCents, locale)}
          delta={metrics.averageTicketDeltaPct}
          locale={locale}
          deltaHint={t('metrics.vsLastWeek')}
        />
        <KpiCard
          label={t('metrics.occupancy')}
          value={`${metrics.occupancyPct} %`}
          delta={metrics.occupancyDeltaPct}
          locale={locale}
          deltaHint={t('metrics.vsLastWeek')}
        />
      </div>

      <div className={s.splitGrid}>
        <article className={s.chartCard} data-component="dashboard-chart-card">
          <header className={s.chartHeader}>
            <h2 className={s.chartTitle}>{tChart('title')}</h2>
            <p className={s.chartSubtitle}>{tChart('subtitle')}</p>
          </header>
          <div className={s.chartBars} role="list">
            {metrics.dailyRevenue.map((point) => {
              const heightPct = computeBarHeightPct(point.revenueCents, maxRevenue);
              return (
                <div
                  key={point.dayKey}
                  role="listitem"
                  className={s.chartBarColumn}
                  data-component={`dashboard-chart-bar-${point.dayKey}`}
                >
                  <div
                    className={s.chartBar}
                    style={{ height: `${heightPct}%` }}
                    aria-label={tChart('barAriaLabel', {
                      day: tChart(`dayShort.${point.dayKey}`),
                      revenue: formatCurrencyFromCents(point.revenueCents, locale),
                      count: point.bookingsCount,
                    })}
                  />
                  <span className={s.chartBarLabel}>{tChart(`dayShort.${point.dayKey}`)}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className={s.topCard} data-component="dashboard-top-services-card">
          <header>
            <h2 className={s.topTitle}>{t('topServices.title')}</h2>
            <p className={s.topSubtitle}>{t('topServices.subtitle')}</p>
          </header>
          <ul className={s.topList}>
            {metrics.topServices.map((service) => (
              <li
                key={service.serviceId}
                className={s.topItem}
                data-component={`dashboard-top-service-${service.serviceId}`}
              >
                <div className={s.topItemInfo}>
                  <span className={s.topItemName}>{pickLocalized(service.name, locale)}</span>
                  <span className={s.topItemMeta}>
                    {t('topServices.bookings', { count: service.bookingsCount })}
                  </span>
                </div>
                <span className={s.topItemValue}>
                  {formatCurrencyFromCents(service.revenueCents, locale)}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  delta: number;
  deltaHint: string;
  locale: SupportedLocale;
}

/**
 * Tarjeta individual de KPI: etiqueta + valor grande + delta vs semana
 * anterior con color semántico según el signo.
 */
function KpiCard({ label, value, delta, deltaHint, locale }: KpiCardProps) {
  const isPositive = delta >= 0;
  const deltaClassName = isPositive ? s.kpiDeltaPositive : s.kpiDeltaNegative;
  const DeltaIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <article className={s.kpiCard} data-component="dashboard-kpi-card">
      <span className={s.kpiLabel}>{label}</span>
      <span className={s.kpiValue}>{value}</span>
      <span className={deltaClassName}>
        <DeltaIcon className="size-3" aria-hidden />
        {formatDeltaPct(delta, locale)}
      </span>
      <span className={s.kpiDeltaHint}>{deltaHint}</span>
    </article>
  );
}
