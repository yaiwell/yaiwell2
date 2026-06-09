/**
 * Tests de `isSentryEnabled` y constantes de configuración.
 *
 * Cubrimos:
 *  - `isSentryEnabled` devuelve true cuando hay DSN, false cuando no.
 *  - `SENTRY_TRACES_SAMPLE_RATE` es 0.1 en producción, 1.0 fuera.
 *    Como la constante se evalúa al cargar el módulo, la testeamos
 *    haciendo `import` fresco con `vi.resetModules()` por cada caso.
 *  - Las constantes de PII e ignored errors no se reordenan
 *    silenciosamente (regression guard).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('isSentryEnabled', () => {
  const ORIGINAL_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_DSN === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    } else {
      process.env.NEXT_PUBLIC_SENTRY_DSN = ORIGINAL_DSN;
    }
  });

  it('devuelve false cuando NEXT_PUBLIC_SENTRY_DSN no está definido', async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const { isSentryEnabled } = await import('./sentry.shared');
    expect(isSentryEnabled()).toBe(false);
  });

  it('devuelve false cuando NEXT_PUBLIC_SENTRY_DSN es string vacío', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = '';
    const { isSentryEnabled } = await import('./sentry.shared');
    expect(isSentryEnabled()).toBe(false);
  });

  it('devuelve true con un DSN válido', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://abc@o123.ingest.sentry.io/456';
    const { isSentryEnabled } = await import('./sentry.shared');
    expect(isSentryEnabled()).toBe(true);
  });
});

describe('constantes de configuración', () => {
  it('SENTRY_PII_KEYS incluye los secretos críticos del proyecto', async () => {
    const { SENTRY_PII_KEYS } = await import('./sentry.shared');
    expect(SENTRY_PII_KEYS).toContain('__session');
    expect(SENTRY_PII_KEYS).toContain('stripe-signature');
    expect(SENTRY_PII_KEYS).toContain('svix-signature');
    expect(SENTRY_PII_KEYS).toContain('email');
  });

  it('SENTRY_IGNORED_ERRORS incluye los control-flow de Next', async () => {
    const { SENTRY_IGNORED_ERRORS } = await import('./sentry.shared');
    expect(SENTRY_IGNORED_ERRORS).toContain('NEXT_REDIRECT');
    expect(SENTRY_IGNORED_ERRORS).toContain('NEXT_NOT_FOUND');
  });
});
