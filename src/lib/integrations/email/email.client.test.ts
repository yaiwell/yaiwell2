/**
 * Tests de `getEmailClient`.
 *
 * Cubrimos:
 *  - Lanza `EmailConfigError` si falta `RESEND_API_KEY` en el primer uso.
 *  - Reutiliza la instancia (singleton) en llamadas sucesivas.
 *  - Se re-inicializa tras `__resetEmailClientForTests`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { __resetEmailClientForTests, getEmailClient } from './email.client';
import { EmailConfigError } from './email.errors';

describe('getEmailClient', () => {
  const ORIGINAL_KEY = process.env.RESEND_API_KEY;

  beforeEach(() => {
    __resetEmailClientForTests();
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = ORIGINAL_KEY;
    __resetEmailClientForTests();
  });

  it('lanza EmailConfigError si RESEND_API_KEY no está configurado', () => {
    delete process.env.RESEND_API_KEY;
    expect(() => getEmailClient()).toThrow(EmailConfigError);
  });

  it('devuelve la misma instancia en llamadas sucesivas (singleton)', () => {
    process.env.RESEND_API_KEY = 're_test_dummy';
    const a = getEmailClient();
    const b = getEmailClient();
    expect(a).toBe(b);
  });

  it('reinicializa tras __resetEmailClientForTests', () => {
    process.env.RESEND_API_KEY = 're_test_dummy';
    const a = getEmailClient();
    __resetEmailClientForTests();
    const b = getEmailClient();
    expect(a).not.toBe(b);
  });
});
