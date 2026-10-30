/**
 * Tests del Route Handler `/api/cron/expire-pending-bookings`.
 *
 * Se verifica la política de acceso (501 sin secreto, 401 sin token o
 * con token incorrecto) y que con el token bueno devuelve el resumen
 * del barrido. La lógica del barrido tiene sus propios tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { expireMock, remindMock, confirmedMock, lateRefundMock, closingMock } = vi.hoisted(() => ({
  closingMock: vi.fn(),
  expireMock: vi.fn(),
  remindMock: vi.fn(),
  confirmedMock: vi.fn(async () => {}),
  lateRefundMock: vi.fn(async () => {}),
}));

vi.mock('@/lib/services/checkout', () => ({ expireAbandonedPendingBookings: expireMock }));
vi.mock('@/lib/services/notifications', () => ({
  sendTomorrowReminders: remindMock,
  notifyBookingConfirmed: confirmedMock,
  notifyLatePaymentRefunded: lateRefundMock,
  scheduleNotification: (task: () => Promise<void>) => void task(),
}));

vi.mock('./daily-closing', () => ({ runDailyClosing: closingMock }));

import { GET } from './route';

const CLOSING_SUMMARY = {
  autoCompleted: 1,
  autoCompleteFailed: 0,
  commissions: null,
  reviewInvites: { sent: 1, skipped: 0 },
};

const SECRET = 'test-cron-secret';

function request(authorization?: string) {
  const headers = new Headers();
  if (authorization) headers.set('authorization', authorization);
  return new Request('http://localhost/api/cron/expire-pending-bookings', {
    headers,
  }) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  expireMock.mockResolvedValue({
    scanned: 2,
    expired: 1,
    settled: 0,
    skipped: 1,
    failed: 0,
    settlements: [],
  });
  remindMock.mockResolvedValue({ scanned: 3, sent: 3, truncated: false });
  closingMock.mockResolvedValue(CLOSING_SUMMARY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/cron/expire-pending-bookings', () => {
  it('responde 401 sin cabecera Authorization', async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(expireMock).not.toHaveBeenCalled();
  });

  it('responde 401 con un token incorrecto', async () => {
    const response = await GET(request('Bearer otro-secreto'));

    expect(response.status).toBe(401);
    expect(expireMock).not.toHaveBeenCalled();
  });

  it('responde 501 si CRON_SECRET no está configurado', async () => {
    vi.stubEnv('CRON_SECRET', '');

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(501);
    // Cuerpo genérico: el nombre de la variable solo va al log.
    expect(JSON.stringify(await response.json())).not.toContain('CRON_SECRET');
    expect(expireMock).not.toHaveBeenCalled();
  });

  it('ejecuta el barrido y devuelve el resumen con el token correcto', async () => {
    const response = await GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      scanned: 2,
      expired: 1,
      settled: 0,
      skipped: 1,
      failed: 0,
      reminders: { scanned: 3, sent: 3, truncated: false },
      closing: CLOSING_SUMMARY,
    });
  });

  it('ejecuta el cierre diario con el barrido de recordatorios en curso', async () => {
    await GET(request(`Bearer ${SECRET}`));

    expect(closingMock).toHaveBeenCalledOnce();
    const [now, startedAt, reminders] = closingMock.mock.calls[0];
    expect(now).toBeInstanceOf(Date);
    expect(typeof startedAt).toBe('number');
    await expect(reminders).resolves.toEqual({ scanned: 3, sent: 3, truncated: false });
  });

  it('un fallo inesperado del cierre diario no tumba la respuesta', async () => {
    closingMock.mockRejectedValue(new Error('boom'));

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    expect((await response.json()).closing).toBeNull();
  });

  it('responde 500 si el barrido falla de raíz, pero los recordatorios salen igual', async () => {
    expireMock.mockRejectedValue(new Error('db down'));

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(500);
    expect(remindMock).toHaveBeenCalledOnce();
  });

  it('un fallo de los recordatorios no impide la caducidad', async () => {
    remindMock.mockRejectedValue(new Error('db down'));

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(500);
    expect(expireMock).toHaveBeenCalledOnce();
  });

  it('avisa de los pagos asentados por webhook perdido, sin incluirlos en la respuesta', async () => {
    expireMock.mockResolvedValue({
      scanned: 2,
      expired: 0,
      settled: 2,
      skipped: 0,
      failed: 0,
      settlements: [
        { bookingId: 'bk-ok', changed: true, status: 'confirmed' },
        { bookingId: 'bk-late', changed: true, status: 'cancelled', lateRefund: 'issued' },
      ],
    });

    const response = await GET(request(`Bearer ${SECRET}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).not.toHaveProperty('settlements');
    expect(body.settled).toBe(2);
    expect(confirmedMock).toHaveBeenCalledWith('bk-ok');
    expect(lateRefundMock).toHaveBeenCalledWith('bk-late', 'issued');
    expect(confirmedMock).toHaveBeenCalledTimes(1);
  });

  it('sin autorización no envía recordatorios', async () => {
    await GET(request('Bearer otro-secreto'));
    expect(remindMock).not.toHaveBeenCalled();
    expect(closingMock).not.toHaveBeenCalled();
  });
});
