/**
 * Tests de la decisión tras comprobar la retención antes de pagar.
 */

import { describe, expect, it } from 'vitest';

import { resolveHoldCheck } from './StripePaymentStep.hold';

describe('resolveHoldCheck', () => {
  it('confirma el pago si la reserva retiene su franja', () => {
    expect(resolveHoldCheck({ ok: true })).toBe('proceed');
  });

  it.each(['HOLD_EXPIRED', 'NOT_FOUND'] as const)('no cobra si el servidor dice %s', (code) => {
    expect(resolveHoldCheck({ ok: false, code })).toBe('expired');
  });

  it('no cobra si faltan menos de 30 minutos', () => {
    expect(resolveHoldCheck({ ok: false, code: 'SLOT_TOO_SOON' })).toBe('too_soon');
  });

  it('pasa a la confirmación si ya está pagada', () => {
    expect(resolveHoldCheck({ ok: false, code: 'ALREADY_PAID' })).toBe('paid');
  });

  it.each(['UNAUTHENTICATED', 'VALIDATION', 'INTERNAL'] as const)(
    'un fallo de la comprobación (%s) no bloquea el pago',
    (code) => {
      expect(resolveHoldCheck({ ok: false, code })).toBe('proceed');
    },
  );

  it('una llamada fallida (red) no bloquea el pago', () => {
    expect(resolveHoldCheck(null)).toBe('proceed');
  });
});
