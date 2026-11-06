/**
 * Botones del selector con plaza del regalo de Mallorca.
 */
import { describe, expect, it } from 'vitest';

import { getFounderPlanCta, pickerHintKey } from './PlanPicker.logic';

describe('getFounderPlanCta', () => {
  it('sin plaza no cambia nada', () => {
    expect(getFounderPlanCta(null, 'free', 'pro', false, 'subscribe')).toBe('subscribe');
  });

  it('durante el regalo bloquea todo menos el plan actual', () => {
    const seat = { locked: true };
    expect(getFounderPlanCta(seat, 'premium', 'pro', false, 'subscribe')).toBe('locked');
    expect(getFounderPlanCta(seat, 'premium', 'free', false, 'unavailable')).toBe('locked');
    expect(getFounderPlanCta(seat, 'premium', 'premium', false, 'current')).toBe('current');
  });

  it('en las últimas 24 h se puede contratar, también Premium', () => {
    const seat = { locked: false };
    expect(getFounderPlanCta(seat, 'premium', 'premium', false, 'current')).toBe('subscribe');
    expect(getFounderPlanCta(seat, 'premium', 'pro', false, 'subscribe')).toBe('subscribe');
    expect(getFounderPlanCta(seat, 'premium', 'free', false, 'unavailable')).toBe('unavailable');
  });

  it('si ya contrató manda la suscripción', () => {
    expect(getFounderPlanCta({ locked: false }, 'pro', 'pro', true, 'current')).toBe('current');
  });
});

describe('pickerHintKey', () => {
  it('elige la nota', () => {
    expect(pickerHintKey({ locked: true }, false)).toBe('founderHint');
    expect(pickerHintKey({ locked: false }, false)).toBe('stripeHint');
    expect(pickerHintKey(null, true)).toBe('lockedHint');
  });
});
