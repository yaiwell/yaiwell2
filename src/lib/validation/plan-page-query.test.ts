import { describe, expect, it } from 'vitest';

import { parsePlanPageQuery, resolveCheckoutState } from './plan-page-query';

describe('parsePlanPageQuery', () => {
  it('lee la vuelta del Checkout', () => {
    expect(
      parsePlanPageQuery({ checkout: 'success', session_id: 'cs_test_abc', plan: 'pro' }),
    ).toEqual({ checkout: 'success', sessionId: 'cs_test_abc', plan: 'pro', onsiteSetup: null });
  });

  it('lee la vuelta del Checkout de setup del cobro en el local', () => {
    expect(
      parsePlanPageQuery({ onsite_setup: 'success', session_id: 'cs_test_setup' }),
    ).toMatchObject({ onsiteSetup: 'success', sessionId: 'cs_test_setup', checkout: null });
    expect(parsePlanPageQuery({ onsite_setup: 'otro' }).onsiteSetup).toBeNull();
  });

  it('descarta valores desconocidos sin romper', () => {
    expect(parsePlanPageQuery({ checkout: 'hack', plan: 'gold', session_id: '' })).toEqual({
      checkout: null,
      sessionId: null,
      plan: null,
      onsiteSetup: null,
    });
  });

  it('con valores repetidos se queda con el primero', () => {
    expect(parsePlanPageQuery({ plan: ['basic', 'premium'] }).plan).toBe('basic');
  });
});

describe('resolveCheckoutState', () => {
  it('sin vuelta del Checkout o con sesión ajena no hay aviso', () => {
    expect(resolveCheckoutState(null, 'active')).toBeNull();
    expect(resolveCheckoutState('mismatch', null)).toBeNull();
  });

  it('activado si se sincronizó o el espejo ya está vivo', () => {
    expect(resolveCheckoutState('synced', 'active')).toBe('activated');
    expect(resolveCheckoutState('pending', 'active')).toBe('activated');
  });

  it('activando mientras Stripe no confirma', () => {
    expect(resolveCheckoutState('pending', null)).toBe('activating');
    expect(resolveCheckoutState('error', 'incomplete')).toBe('activating');
  });
});
