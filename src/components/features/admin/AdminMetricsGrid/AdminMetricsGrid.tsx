import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { adminMetricsGridStyles as s } from './AdminMetricsGrid.styles';
import type { AdminMetricsGridProps } from './AdminMetricsGrid.types';

/**
 * Grid de cards KPI del dashboard admin.
 *
 * Server Component puro: recibe métricas ya calculadas y formateadas
 * y solo se ocupa de pintarlas con la paleta correspondiente al signo
 * del delta semanal. El icono de flecha y el color cambian a la vez.
 */
export function AdminMetricsGrid({ metrics }: AdminMetricsGridProps) {
  const t = useTranslations('adminArea.metrics');

  return (
    <div className={s.grid} data-component="admin-metrics-grid">
      {metrics.map((metric) => {
        const isPositive = metric.deltaPercent >= 0;
        const Arrow = isPositive ? ArrowUpRight : ArrowDownRight;
        const deltaText = `${isPositive ? '+' : ''}${metric.deltaPercent.toFixed(1)}%`;

        return (
          <article
            key={metric.key}
            className={s.card}
            data-component={`admin-metric-${metric.key}`}
          >
            <span className={s.label}>{t(metric.key)}</span>
            <span className={s.value}>{metric.value}</span>
            <span
              className={cn(s.deltaWrap, isPositive ? s.deltaPositive : s.deltaNegative)}
              aria-label={t('weeklyDelta', { delta: deltaText })}
            >
              <Arrow className="size-3" aria-hidden="true" />
              {deltaText}
            </span>
          </article>
        );
      })}
    </div>
  );
}
