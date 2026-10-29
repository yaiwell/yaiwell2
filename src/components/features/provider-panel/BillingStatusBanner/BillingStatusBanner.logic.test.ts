import { describe, expect, it } from 'vitest';

import { buildSummary, PRO_ACTIVE } from '../plan-shared/plan-shared.test-fixtures';

import { resolveBillingBanner } from './BillingStatusBanner.logic';

describe('resolveBillingBanner', () => {
  it('sin suscripción ni vuelta del Checkout no hay aviso', () => {
    expect(resolveBillingBanner(buildSummary())).toBeNull();
    expect(resolveBillingBanner(buildSummary(PRO_ACTIVE))).toBeNull();
  });

  it('la vuelta del Checkout manda sobre todo lo demás', () => {
    const summary = buildSummary({ ...PRO_ACTIVE, subscriptionStatus: 'past_due' });
    expect(resolveBillingBanner(summary, 'activating')?.variant).toBe('activating');
    expect(resolveBillingBanner(summary, 'activated')?.variant).toBe('activated');
  });

  it('cobro fallido: error con el portal de la tarjeta', () => {
    const view = resolveBillingBanner(
      buildSummary({ ...PRO_ACTIVE, subscriptionStatus: 'past_due' }),
    );
    expect(view).toMatchObject({
      variant: 'past_due',
      tone: 'error',
      tier: 'pro',
      portalIntent: 'payment_method',
    });
  });

  it('primer pago por confirmar: action_required', () => {
    const view = resolveBillingBanner(
      buildSummary({
        hasCustomer: true,
        subscriptionStatus: 'incomplete',
        subscribedTier: 'basic',
      }),
    );
    expect(view).toMatchObject({ variant: 'action_required', tier: 'basic' });
  });

  it('cancelación programada: fecha de fin del periodo', () => {
    const view = resolveBillingBanner(buildSummary({ ...PRO_ACTIVE, cancelAtPeriodEnd: true }));
    expect(view).toMatchObject({
      variant: 'cancel_scheduled',
      tier: 'pro',
      date: PRO_ACTIVE.currentPeriodEnd,
      portalIntent: 'manage',
    });
  });

  it('bajada programada: plan destino y fecha del cambio', () => {
    const at = new Date('2026-11-29T10:00:00Z');
    const view = resolveBillingBanner(
      buildSummary({ ...PRO_ACTIVE, scheduledTier: 'basic', scheduledChangeAt: at }),
    );
    expect(view).toMatchObject({ variant: 'downgrade_scheduled', tier: 'basic', date: at });
  });

  it('una suscripción muerta no genera avisos de cambios programados', () => {
    const view = resolveBillingBanner(
      buildSummary({ ...PRO_ACTIVE, subscriptionStatus: 'canceled', cancelAtPeriodEnd: true }),
    );
    expect(view).toBeNull();
  });
});
