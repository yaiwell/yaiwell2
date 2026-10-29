'use client';

import { Loader2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { PANEL_TIMEZONE } from '@/lib/utils/madrid-week';
import { formatCommissionRate, formatPlanPrice } from '@/lib/utils/plan-format';

import {
  PlanActionError,
  planSharedStyles as shared,
  portalActionKey,
  usePlanBillingActions,
} from '../plan-shared';

import { buildPlanSummaryView } from './PlanSummaryCard.logic';
import { planSummaryCardStyles as s } from './PlanSummaryCard.styles';
import type { PlanSummaryCardProps } from './PlanSummaryCard.types';

/**
 * Resumen del plan del negocio: plan, cuota, comisión, uso del cupo de
 * servicios y renovación. Enlaza a `/panel/plan` y abre el portal de
 * Stripe para facturas y tarjeta.
 */
export function PlanSummaryCard({
  summary,
  locale,
  showChangePlanLink = true,
}: PlanSummaryCardProps) {
  const t = useTranslations('providerPanel.plan');
  const format = useFormatter();
  const view = buildPlanSummaryView(summary);
  const { pendingKey, isBusy, errorCode, openPortal } = usePlanBillingActions(locale);
  const { plan } = summary;
  const invoicesPending = pendingKey === portalActionKey('manage');

  const price =
    plan.monthlyPriceCents === 0
      ? t('card.free')
      : t('summary.priceValue', { price: formatPlanPrice(plan.monthlyPriceCents, locale) });
  const services =
    view.usage.kind === 'unlimited'
      ? t('summary.servicesUnlimited', { used: view.usage.used })
      : t('summary.servicesUsage', { used: view.usage.used, max: view.usage.max });
  const periodDate = view.period
    ? format.dateTime(view.period.date, { dateStyle: 'long', timeZone: PANEL_TIMEZONE })
    : null;

  return (
    <article className={s.card} data-component="plan-summary-card" data-tier={plan.tier}>
      <header className={s.header}>
        <span className={s.eyebrow}>{t('summary.title')}</span>
        <h2 className={s.title}>{t(`tierNames.${plan.tier}`)}</h2>
      </header>

      <dl className={s.list}>
        <div className={s.item}>
          <dt className={s.term}>{t('summary.priceLabel')}</dt>
          <dd className={s.value}>{price}</dd>
        </div>
        <div className={s.item}>
          <dt className={s.term}>{t('summary.commissionLabel')}</dt>
          <dd className={s.value}>{formatCommissionRate(plan.commissionRateBps, locale)}</dd>
        </div>
        <div className={s.item}>
          <dt className={s.term}>{t('summary.servicesLabel')}</dt>
          <dd className={s.value} data-component="plan-summary-services">
            {services}
          </dd>
        </div>
      </dl>

      {view.period && periodDate ? (
        <p className={s.note} data-component="plan-summary-period">
          {view.period.kind === 'ends'
            ? t('summary.endsOn', { date: periodDate })
            : t('summary.renewsOn', { date: periodDate })}
        </p>
      ) : null}
      {summary.servicesPausedByPlan > 0 ? (
        <p className={s.note}>
          {t('summary.pausedByPlan', { count: summary.servicesPausedByPlan })}
        </p>
      ) : null}

      <PlanActionError code={errorCode} className={shared.errorNotice} />

      <div className={s.actions}>
        {view.showInvoices ? (
          <button
            type="button"
            className={shared.secondaryCta}
            disabled={isBusy}
            aria-busy={invoicesPending}
            onClick={() => void openPortal('manage')}
            data-component="plan-summary-invoices"
          >
            {invoicesPending ? <Loader2 className={shared.spinner} aria-hidden /> : null}
            {invoicesPending ? t('cta.loading') : t('summary.invoices')}
          </button>
        ) : null}
        {showChangePlanLink ? (
          <Link
            href="/panel/plan"
            className={shared.primaryCta}
            data-component="plan-summary-change"
          >
            {t('summary.changePlan')}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
