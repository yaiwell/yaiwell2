/**
 * Tests del Route Handler `/api/cron/expire-pending-bookings`.
 *
 * Se verifica la política de acceso (501 sin secreto, 401 sin token o
 * con token incorrecto) y que con el token bueno devuelve el resumen
 * del barrido. La lógica del barrido tiene sus propios tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { expireMock, remindMock } = vi.hoisted(() => ({
  expireMock: vi.fn(),
  remindMock: vi.fn(),
}));

vi.mock('@/lib/services/checkout', () => ({ expireAbandonedPendingBookings: expireMock }));
vi.mock('@/lib/services/notifications', () => ({ sendTomorrowReminders: remindMock }));

import { GET } from './route';

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
  expireMock.mockResolvedValue({ scanned: 2, expired: 1, skipped: 1, failed: 0 });
  remindMock.mockResolvedValue({ scanned: 3, sent: 3, truncated: false });
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
      skipped: 1,
      failed: 0,
      reminders: { scanned: 3, sent: 3, truncated: false },
    });
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

  it('sin autorización no envía recordatorios', async () => {
    await GET(request('Bearer otro-secreto'));
    expect(remindMock).not.toHaveBeenCalled();
  });
});
