import { describe, expect, it } from 'vitest';

import { buildSummary, PRO_ACTIVE } from '../plan-shared/plan-shared.test-fixtures';

import { buildPlanSummaryView } from './PlanSummaryCard.logic';

describe('buildPlanSummaryView', () => {
  it('Gratis: cupo limitado, sin periodo ni facturas', () => {
    expect(buildPlanSummaryView(buildSummary())).toEqual({
      usage: { kind: 'limited', used: 1, max: 1 },
      period: null,
      showInvoices: false,
    });
  });

  it('Premium: servicios ilimitados', () => {
    const view = buildPlanSummaryView(
      buildSummary({
        ...PRO_ACTIVE,
        plan: {
          tier: 'premium',
          monthlyPriceCents: 9900,
          commissionRateBps: 600,
          maxServices: 999,
        },
        activeServices: 72,
      }),
    );
    expect(view.usage).toEqual({ kind: 'unlimited', used: 72 });
  });

  it('suscripción viva: se renueva o termina según cancelAtPeriodEnd', () => {
    expect(buildPlanSummaryView(buildSummary(PRO_ACTIVE)).period).toEqual({
      kind: 'renews',
      date: PRO_ACTIVE.currentPeriodEnd,
    });
    expect(
      buildPlanSummaryView(buildSummary({ ...PRO_ACTIVE, cancelAtPeriodEnd: true })).period?.kind,
    ).toBe('ends');
  });

  it('suscripción cancelada: sin periodo pero con facturas', () => {
    const view = buildPlanSummaryView(
      buildSummary({ ...PRO_ACTIVE, subscriptionStatus: 'canceled' }),
    );
    expect(view.period).toBeNull();
    expect(view.showInvoices).toBe(true);
  });
});
