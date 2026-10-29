import { describe, expect, it } from 'vitest';

import { ctaActionKey, getPlanCta, hasScheduledChange, isActionableCta } from './PlanPicker.logic';

/**
 * Tabla de decisión de la CTA de cada tarjeta del selector de planes.
 * Lo crítico: nunca ofrecer un Checkout a quien ya paga (cobraría dos
 * veces) ni apilar cambios cuando ya hay uno programado.
 */
describe('getPlanCta', () => {
  it('el plan actual nunca tiene acción', () => {
    expect(getPlanCta('free', 'free', null, false)).toBe('current');
    expect(getPlanCta('pro', 'pro', 'active', true)).toBe('current');
  });

  it('sin suscripción viva los planes de pago se contratan', () => {
    expect(getPlanCta('free', 'basic', null, false)).toBe('subscribe');
    expect(getPlanCta('free', 'premium', 'canceled', false)).toBe('subscribe');
    expect(getPlanCta('free', 'pro', 'incomplete', false)).toBe('subscribe');
  });

  it('un plan de pago sin suscripción no ofrece pasar a Gratis', () => {
    expect(getPlanCta('pro', 'free', null, false)).toBe('unavailable');
  });

  it('con suscripción viva los cambios van por el portal', () => {
    expect(getPlanCta('basic', 'pro', 'active', true)).toBe('change');
    expect(getPlanCta('premium', 'basic', 'trialing', true)).toBe('change');
    expect(getPlanCta('pro', 'free', 'active', true)).toBe('downgrade_free');
  });

  it('con el cobro fallando pide primero actualizar la tarjeta', () => {
    expect(getPlanCta('pro', 'premium', 'past_due', true)).toBe('fix_payment');
    expect(getPlanCta('pro', 'free', 'past_due', true)).toBe('fix_payment');
  });

  it('con una cancelación programada marca Gratis y bloquea el resto', () => {
    const schedule = { scheduledTier: null, cancelAtPeriodEnd: true };
    expect(getPlanCta('pro', 'free', 'active', true, schedule)).toBe('scheduled');
    expect(getPlanCta('pro', 'premium', 'active', true, schedule)).toBe('locked');
    expect(getPlanCta('pro', 'pro', 'active', true, schedule)).toBe('current');
  });

  it('con una bajada programada marca el destino y bloquea el resto', () => {
    const schedule = { scheduledTier: 'basic' as const, cancelAtPeriodEnd: false };
    expect(getPlanCta('premium', 'basic', 'active', true, schedule)).toBe('scheduled');
    expect(getPlanCta('premium', 'pro', 'active', true, schedule)).toBe('locked');
    expect(getPlanCta('premium', 'free', 'active', true, schedule)).toBe('locked');
  });

  it('un scheduledTier igual al actual no cuenta como cambio', () => {
    const schedule = { scheduledTier: 'pro' as const, cancelAtPeriodEnd: false };
    expect(getPlanCta('pro', 'premium', 'active', true, schedule)).toBe('change');
    expect(hasScheduledChange('pro', schedule)).toBe(false);
  });
});

describe('isActionableCta / ctaActionKey', () => {
  it('solo las CTAs que llevan a Stripe son accionables y tienen clave', () => {
    expect(isActionableCta('subscribe')).toBe(true);
    expect(isActionableCta('current')).toBe(false);
    expect(isActionableCta('locked')).toBe(false);
    expect(ctaActionKey('subscribe', 'pro')).toBe('checkout:pro');
    expect(ctaActionKey('change', 'basic')).toBe('portal:change:basic');
    expect(ctaActionKey('downgrade_free', 'free')).toBe('portal:cancel:');
    expect(ctaActionKey('scheduled', 'free')).toBeNull();
  });
});
