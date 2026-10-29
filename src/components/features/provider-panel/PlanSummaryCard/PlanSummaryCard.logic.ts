/**
 * Lógica pura de la tarjeta resumen del plan. Sin `'use client'`.
 */
import type { ProviderBillingSummary } from '@/lib/services/billing';
import { isLiveSubscriptionStatus } from '@/lib/utils/plan-billing';
import { isUnlimitedServices } from '@/lib/utils/plan-limits';

import type { PeriodView, PlanSummaryView, ServicesUsageView } from './PlanSummaryCard.types';

/**
 * Convierte el resumen de facturación en lo que pinta la tarjeta.
 *
 * El periodo solo se enseña con suscripción viva: una cancelada no
 * «se renueva» ni «termina» (ya terminó y el negocio está en Gratis).
 */
export function buildPlanSummaryView(summary: ProviderBillingSummary): PlanSummaryView {
  const { maxServices } = summary.plan;
  const usage: ServicesUsageView = isUnlimitedServices(maxServices)
    ? { kind: 'unlimited', used: summary.activeServices }
    : { kind: 'limited', used: summary.activeServices, max: maxServices };

  let period: PeriodView = null;
  if (isLiveSubscriptionStatus(summary.subscriptionStatus) && summary.currentPeriodEnd) {
    period = {
      kind: summary.cancelAtPeriodEnd ? 'ends' : 'renews',
      date: summary.currentPeriodEnd,
    };
  }

  return { usage, period, showInvoices: summary.hasCustomer };
}
