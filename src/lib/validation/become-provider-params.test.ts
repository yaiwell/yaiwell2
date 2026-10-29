/**
 * Tests de la validación del plan y la entrada de `becomeProviderAction`.
 * El plan es dato de fuera: un valor raro se descarta, nunca rompe.
 */

import { describe, expect, it } from 'vitest';

import { becomeProviderInputSchema, parseBecomeProviderPlan } from './become-provider-params';

describe('parseBecomeProviderPlan', () => {
  it('acepta los tiers del catálogo', () => {
    expect(parseBecomeProviderPlan('premium')).toBe('premium');
  });

  it.each([[undefined], [''], ['gold'], [['pro', 'basic']], [7]])('descarta %j', (raw) => {
    expect(parseBecomeProviderPlan(raw)).toBeNull();
  });
});

describe('becomeProviderInputSchema', () => {
  it('exige un locale soportado', () => {
    expect(becomeProviderInputSchema.safeParse({ locale: 'fr' }).success).toBe(false);
  });

  it('ignora un plan inválido sin fallar', () => {
    expect(becomeProviderInputSchema.parse({ locale: 'de', plan: 'gold' })).toEqual({
      locale: 'de',
      plan: null,
    });
  });
});
