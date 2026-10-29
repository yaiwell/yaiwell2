/**
 * Tipos de la tarjeta resumen del plan (`/panel/centro` y `/panel/plan`).
 */
import type { AppLocale } from '@/i18n/routing';
import type { ProviderBillingSummary } from '@/lib/services/billing';

export interface PlanSummaryCardProps {
  summary: ProviderBillingSummary;
  locale: AppLocale;
  /** «Cambiar plan» lleva a `/panel/plan`; allí mismo sobra. */
  showChangePlanLink?: boolean;
}

/** Uso del cupo de servicios. */
export type ServicesUsageView =
  | { kind: 'unlimited'; used: number }
  | { kind: 'limited'; used: number; max: number };

/** Próximo hito de la suscripción: renovación o fin. */
export type PeriodView = { kind: 'renews' | 'ends'; date: Date } | null;

export interface PlanSummaryView {
  usage: ServicesUsageView;
  period: PeriodView;
  /** El portal solo tiene sentido si hay Customer en Stripe. */
  showInvoices: boolean;
}
