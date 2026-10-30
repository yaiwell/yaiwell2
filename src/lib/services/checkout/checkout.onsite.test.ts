import { describe, expect, it } from 'vitest';

import { isProviderOnsiteReady, resolvePaymentOptions } from './checkout.onsite';

const NOW = new Date('2026-11-02T10:00:00.000Z');
const MIN = 60 * 1000;
const inMin = (m: number) => new Date(NOW.getTime() + m * MIN);
const READY = new Date('2026-10-01T00:00:00Z');

describe('isProviderOnsiteReady', () => {
  it('activo + método de pago + sin deuda', () => {
    expect(
      isProviderOnsiteReady({
        acceptsOnsitePayment: true,
        billing: { onsitePaymentMethodReadyAt: READY, commissionDebtSince: null },
      }),
    ).toBe(true);
  });

  it('desactivado, sin facturación, sin método o con deuda → no', () => {
    expect(isProviderOnsiteReady(null)).toBe(false);
    expect(
      isProviderOnsiteReady({
        acceptsOnsitePayment: false,
        billing: { onsitePaymentMethodReadyAt: READY, commissionDebtSince: null },
      }),
    ).toBe(false);
    expect(isProviderOnsiteReady({ acceptsOnsitePayment: true, billing: null })).toBe(false);
    expect(
      isProviderOnsiteReady({
        acceptsOnsitePayment: true,
        billing: { onsitePaymentMethodReadyAt: null, commissionDebtSince: null },
      }),
    ).toBe(false);
    expect(
      isProviderOnsiteReady({
        acceptsOnsitePayment: true,
        billing: { onsitePaymentMethodReadyAt: READY, commissionDebtSince: READY },
      }),
    ).toBe(false);
  });
});

describe('resolvePaymentOptions', () => {
  const base = { now: NOW, providerReady: true, clientRestrictedUntil: null };

  it('online siempre disponible; en el local disponible a 2h00 justas', () => {
    expect(resolvePaymentOptions({ ...base, slotStart: inMin(120) })).toEqual({
      online: 'available',
      onsite: 'available',
      restrictedUntilIso: null,
    });
  });

  it('a 1h59 → last_minute', () => {
    expect(resolvePaymentOptions({ ...base, slotStart: inMin(119) }).onsite).toBe('last_minute');
  });

  it('cliente bloqueado → client_restricted con la fecha', () => {
    const until = new Date('2027-01-15T10:00:00Z');
    expect(
      resolvePaymentOptions({ ...base, slotStart: inMin(240), clientRestrictedUntil: until }),
    ).toEqual({
      online: 'available',
      onsite: 'client_restricted',
      restrictedUntilIso: until.toISOString(),
    });
  });

  it('negocio no dispuesto gana a todo: not_offered', () => {
    expect(
      resolvePaymentOptions({
        now: NOW,
        slotStart: inMin(60),
        providerReady: false,
        clientRestrictedUntil: new Date('2027-01-15T10:00:00Z'),
      }),
    ).toEqual({ online: 'available', onsite: 'not_offered', restrictedUntilIso: null });
  });

  it('última hora gana al bloqueo del cliente (motivo más útil)', () => {
    expect(
      resolvePaymentOptions({
        ...base,
        slotStart: inMin(60),
        clientRestrictedUntil: new Date('2027-01-15T10:00:00Z'),
      }),
    ).toEqual({ online: 'available', onsite: 'last_minute', restrictedUntilIso: null });
  });
});
