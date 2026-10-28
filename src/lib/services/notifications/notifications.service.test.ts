/**
 * Tests del servicio de avisos: a quién se envía, con qué clave de
 * idempotencia y que un fallo nunca se propaga al flujo de negocio.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  findBookingContext: vi.fn(),
  findProviderContext: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/integrations/email', () => {
  class EmailConfigError extends Error {}
  return { sendEmail: mocks.sendEmail, EmailConfigError };
});
vi.mock('./notifications.repository', () => ({
  notificationsRepository: {
    findBookingContext: mocks.findBookingContext,
    findProviderContext: mocks.findProviderContext,
  },
}));

import {
  notifyBookingCancelledByProvider,
  notifyBookingConfirmed,
  notifyLatePaymentRefunded,
  notifyProviderRejected,
} from './notifications.service';
import { isTestAddress } from './notifications.delivery';

const booking = {
  bookingId: 'bk-1',
  status: 'confirmed',
  startAt: new Date('2026-11-10T17:30:00.000Z'),
  priceCents: 3000,
  originalPriceCents: null,
  discountPct: null,
  notes: null,
  serviceName: { es: 'Corte' },
  professionalName: null,
  provider: { id: 'prov-1', name: 'Studio Aura', slug: 'studio-aura', address: 'Major 1' },
  client: { email: 'ana@yaiwell.com', locale: 'es', fullName: 'Ana' },
  owner: { email: 'centro@yaiwell.com', locale: 'es', fullName: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  mocks.sendEmail.mockResolvedValue({ providerId: 'em_1' });
  mocks.findBookingContext.mockResolvedValue(booking);
});

describe('notifyBookingConfirmed', () => {
  it('envía el recibo al cliente y el aviso al centro con claves distintas', async () => {
    await notifyBookingConfirmed('bk-1');

    const calls = mocks.sendEmail.mock.calls.map(([m]) => [m.to[0], m.idempotencyKey]);
    expect(calls).toEqual(
      expect.arrayContaining([
        ['ana@yaiwell.com', 'booking-confirmed-client/bk-1'],
        ['centro@yaiwell.com', 'booking-new-provider/bk-1'],
      ]),
    );
  });

  it('no lanza si Resend falla', async () => {
    mocks.sendEmail.mockRejectedValue(new Error('rate limited'));
    await expect(notifyBookingConfirmed('bk-1')).resolves.toBeUndefined();
  });

  it('no lanza si la lectura de BD falla', async () => {
    mocks.findBookingContext.mockRejectedValue(new Error('db down'));
    await expect(notifyBookingConfirmed('bk-1')).resolves.toBeUndefined();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('no escribe a direcciones de prueba de los E2E', async () => {
    mocks.findBookingContext.mockResolvedValue({
      ...booking,
      client: { ...booking.client, email: 'e2e+clerk_test@example.com' },
    });
    await notifyBookingConfirmed('bk-1');
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail.mock.calls[0][0].to).toEqual(['centro@yaiwell.com']);
  });
});

describe('notifyBookingCancelledByProvider', () => {
  it('avisa solo al cliente', async () => {
    mocks.findBookingContext.mockResolvedValue({ ...booking, status: 'cancelled' });
    await notifyBookingCancelledByProvider('bk-1', 'refunded');
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail.mock.calls[0][0]).toMatchObject({
      to: ['ana@yaiwell.com'],
      idempotencyKey: 'booking-cancelled/bk-1',
    });
  });
});

describe('estado de la reserva al enviar', () => {
  it('no manda el recibo si la reserva ya no está confirmada', async () => {
    mocks.findBookingContext.mockResolvedValue({ ...booking, status: 'cancelled' });
    await notifyBookingConfirmed('bk-1');
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});

describe('notifyLatePaymentRefunded', () => {
  it('avisa al cliente con su propia clave', async () => {
    mocks.findBookingContext.mockResolvedValue({ ...booking, status: 'cancelled' });
    await notifyLatePaymentRefunded('bk-1', 'issued');
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail.mock.calls[0][0]).toMatchObject({
      to: ['ana@yaiwell.com'],
      idempotencyKey: 'late-payment-refund/bk-1',
    });
  });
});

describe('isTestAddress', () => {
  it.each([
    ['e2e+clerk_test@example.com', true],
    ['dev-client@yaiwell.local', true],
    ['x@foo.test', true],
    ['ana@gmail.com', false],
  ])('%s → %s', (email, expected) => {
    expect(isTestAddress(email)).toBe(expected);
  });
});

describe('notifyProviderRejected', () => {
  it('un segundo rechazo con otro motivo usa otra clave', async () => {
    mocks.findProviderContext.mockResolvedValue({
      providerId: 'prov-1',
      name: 'Studio Aura',
      owner: booking.owner,
    });
    await notifyProviderRejected('prov-1', 'Falta el CIF');
    await notifyProviderRejected('prov-1', 'Fotos borrosas');
    const [first, second] = mocks.sendEmail.mock.calls.map(([m]) => m.idempotencyKey);
    expect(first).toMatch(/^provider-rejected\/prov-1\//);
    expect(first).not.toBe(second);
  });
});
