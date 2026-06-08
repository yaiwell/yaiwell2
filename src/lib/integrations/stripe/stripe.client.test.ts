/**
 * Tests de `getStripeClient`.
 *
 * Cubrimos:
 *  - Lanza si falta `STRIPE_SECRET_KEY` en el momento del primer uso.
 *  - Reutiliza la instancia (singleton) en llamadas sucesivas.
 *  - Se re-inicializa tras `__resetStripeClientForTests` (escape hatch
 *    para que el resto de tests del módulo puedan forzar un fresco).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { __resetStripeClientForTests, getStripeClient } from './stripe.client';

describe('getStripeClient', () => {
  const ORIGINAL_KEY = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    __resetStripeClientForTests();
  });

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = ORIGINAL_KEY;
    __resetStripeClientForTests();
  });

  it('lanza si STRIPE_SECRET_KEY no está configurado', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => getStripeClient()).toThrow('STRIPE_SECRET_KEY no está configurado.');
  });

  it('devuelve la misma instancia en llamadas sucesivas (singleton)', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    const a = getStripeClient();
    const b = getStripeClient();
    expect(a).toBe(b);
  });

  it('reinicializa tras __resetStripeClientForTests', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    const a = getStripeClient();
    __resetStripeClientForTests();
    const b = getStripeClient();
    expect(a).not.toBe(b);
  });
});
