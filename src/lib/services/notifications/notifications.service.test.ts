/**
 * Tests del servicio de avisos: a quién se envía, con qué clave de
 * idempotencia y que un fallo nunca se propaga al flujo de negocio.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  findBookingContext: vi.fn(),
  findProviderContext: vi.fn(),
  findConfirmedBookingIdsStartingBetween: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/integrations/email', () => {
  class EmailConfigError extends Error {}
  class EmailSendError extends Error {
    constructor(readonly retryable: boolean) {
      super('resend failed');
    }
  }
  return { sendEmail: mocks.sendEmail, EmailConfigError, EmailSendError };
});
vi.mock('./notifications.repository', () => ({
  notificationsRepository: {
    findBookingContext: mocks.findBookingContext,
    findProviderContext: mocks.findProviderContext,
    findConfirmedBookingIdsStartingBetween: mocks.findConfirmedBookingIdsStartingBetween,
  },
}));

import {
  notifyBookingCancelledByProvider,
  notifyBookingConfirmed,
  notifyLatePaymentRefunded,
  notifyProviderRejected,
  notifyRefundCompleted,
  notifyRefundDelayed,
} from './notifications.service';
import { sendTomorrowReminders } from './notifications.reminders';

const booking = {
  bookingId: 'bk-1',
  status: 'confirmed',
  startAt: new Date('2026-11-10T17:30:00.000Z'),
  createdAt: new Date('2026-11-01T10:00:00.000Z'),
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

describe('notifyProviderRejected', () => {
  it('la clave va por decisión: un segundo rechazo con el mismo motivo también llega', async () => {
    mocks.findProviderContext.mockResolvedValue({
      providerId: 'prov-1',
      name: 'Studio Aura',
      owner: booking.owner,
    });
    await notifyProviderRejected('prov-1', 'vr-1', 'Falta el CIF');
    await notifyProviderRejected('prov-1', 'vr-2', 'Falta el CIF');
    const keys = mocks.sendEmail.mock.calls.map(([m]) => m.idempotencyKey);
    expect(keys).toEqual(['provider-rejected/vr-1', 'provider-rejected/vr-2']);
  });
});

describe('sendTomorrowReminders', () => {
  it('busca las citas del día siguiente en Madrid y avisa a cada cliente', async () => {
    mocks.findConfirmedBookingIdsStartingBetween.mockResolvedValue(['bk-1', 'bk-2']);
    // 03:30 UTC del 9 de noviembre = 04:30 en Madrid: mañana es el día 10.
    const summary = await sendTomorrowReminders(new Date('2026-11-09T03:30:00.000Z'), 0);

    expect(mocks.findConfirmedBookingIdsStartingBetween).toHaveBeenCalledWith(
      new Date('2026-11-09T23:00:00.000Z'),
      new Date('2026-11-10T23:00:00.000Z'),
    );
    expect(summary).toEqual({ scanned: 2, sent: 2, truncated: false });
    const keys = mocks.sendEmail.mock.calls.map(([m]) => m.idempotencyKey);
    expect(keys).toEqual(['booking-reminder/bk-1', 'booking-reminder/bk-2']);
  });

  it('no recuerda una cita que ya no está confirmada', async () => {
    mocks.findConfirmedBookingIdsStartingBetween.mockResolvedValue(['bk-1']);
    mocks.findBookingContext.mockResolvedValue({ ...booking, status: 'cancelled' });
    await sendTomorrowReminders(new Date('2026-11-09T03:30:00.000Z'), 0);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});

describe('notifyRefundCompleted', () => {
  it('avisa al cliente con la clave compartida por admin y webhook', async () => {
    mocks.findBookingContext.mockResolvedValue({ ...booking, status: 'refunded' });
    await notifyRefundCompleted('bk-1');
    expect(mocks.sendEmail.mock.calls[0][0]).toMatchObject({
      to: ['ana@yaiwell.com'],
      idempotencyKey: 'refund-completed/bk-1',
    });
  });

  it.each(['confirmed', 'completed'])('no avisa si la reserva está %s', async (status) => {
    mocks.findBookingContext.mockResolvedValue({ ...booking, status });
    await notifyRefundCompleted('bk-1');
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});

describe('sendTomorrowReminders: límites', () => {
  const NOW = new Date('2026-11-09T03:30:00.000Z');

  it('corta en el tope por ejecución y lo marca como truncado', async () => {
    const ids = Array.from({ length: 65 }, (_, i) => `bk-${i}`);
    mocks.findConfirmedBookingIdsStartingBetween.mockResolvedValue(ids);
    const summary = await sendTomorrowReminders(NOW, 0);
    expect(summary).toEqual({ scanned: 65, sent: 60, truncated: true });
  });

  it('un envío que falla no corta el resto', async () => {
    mocks.findConfirmedBookingIdsStartingBetween.mockResolvedValue(['bk-1', 'bk-2']);
    mocks.sendEmail.mockRejectedValueOnce(new Error('rate limited'));
    const summary = await sendTomorrowReminders(NOW, 0);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(summary.sent).toBe(2);
  });

  it('se para al agotar el tiempo', async () => {
    mocks.findConfirmedBookingIdsStartingBetween.mockResolvedValue(['bk-1', 'bk-2']);
    const summary = await sendTomorrowReminders(NOW, 0, -1);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(summary).toEqual({ scanned: 2, sent: 0, truncated: true });
  });
});

describe('notifyRefundDelayed', () => {
  it('avisa al cliente con una clave por refund fallido', async () => {
    mocks.findBookingContext.mockResolvedValue({ ...booking, status: 'cancelled' });
    await notifyRefundDelayed('bk-1', 're_1');
    expect(mocks.sendEmail.mock.calls[0][0]).toMatchObject({
      to: ['ana@yaiwell.com'],
      idempotencyKey: 'refund-delayed/re_1',
    });
  });

  it('no avisa si la reserva ya consta como reembolsada', async () => {
    mocks.findBookingContext.mockResolvedValue({ ...booking, status: 'refunded' });
    await notifyRefundDelayed('bk-1', 're_1');
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
