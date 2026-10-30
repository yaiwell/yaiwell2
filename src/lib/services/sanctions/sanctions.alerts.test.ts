/**
 * Tests de la alerta de no presentados por negocio (antiabuso
 * 2026-10-30): umbrales, ventana de 30 días, aviso sin datos del cliente,
 * agrupación por negocio y día, y que nunca lanza.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  countStarted: vi.fn(),
  captureMessage: vi.fn(),
  sentryEnabled: vi.fn(() => true),
}));

vi.mock('@/lib/integrations/sentry', () => ({ isSentryEnabled: mocks.sentryEnabled }));
vi.mock('@sentry/nextjs', () => ({ captureMessage: mocks.captureMessage }));
vi.mock('./sanctions.repository', () => ({
  sanctionsRepository: { countOnsiteStartedSince: mocks.countStarted },
}));

import { checkProviderNoShowRate, shouldAlertNoShowRate } from './sanctions.alerts';

// 23:30 UTC del 2 de noviembre = 3 de noviembre en Madrid.
const NOW = new Date('2026-11-02T23:30:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sentryEnabled.mockReturnValue(true);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('shouldAlertNoShowRate', () => {
  it('menos de 5 reservas → nunca avisa, aunque todas sean no presentado', () => {
    expect(shouldAlertNoShowRate({ total: 4, noShows: 4 })).toBe(false);
  });

  it('un 20 % justo no avisa; por encima, sí', () => {
    expect(shouldAlertNoShowRate({ total: 5, noShows: 1 })).toBe(false);
    expect(shouldAlertNoShowRate({ total: 10, noShows: 2 })).toBe(false);
    expect(shouldAlertNoShowRate({ total: 5, noShows: 2 })).toBe(true);
    expect(shouldAlertNoShowRate({ total: 9, noShows: 2 })).toBe(true);
  });
});

describe('checkProviderNoShowRate', () => {
  it('mira los últimos 30 días hasta ahora', async () => {
    mocks.countStarted.mockResolvedValue({ total: 3, noShows: 1 });
    await checkProviderNoShowRate('prov-1', NOW);
    expect(mocks.countStarted).toHaveBeenCalledWith(
      'prov-1',
      new Date('2026-10-03T23:30:00.000Z'),
      NOW,
    );
    expect(mocks.captureMessage).not.toHaveBeenCalled();
  });

  it('por encima del umbral: warning con negocio y cifras, agrupado por negocio y día de Madrid', async () => {
    mocks.countStarted.mockResolvedValue({ total: 8, noShows: 3 });
    await checkProviderNoShowRate('prov-1', NOW);

    expect(mocks.captureMessage).toHaveBeenCalledTimes(1);
    const [message, ctx] = mocks.captureMessage.mock.calls[0] as [string, Record<string, unknown>];
    expect(message).toContain('3/8');
    expect(message).toContain('37.5%');
    expect(ctx).toEqual({
      level: 'warning',
      tags: { domain: 'sanctions', providerId: 'prov-1' },
      extra: { noShows: 3, total: 8, ratePct: 37.5, dateKey: '2026-11-03' },
      fingerprint: ['onsite-no-show-rate', 'prov-1', '2026-11-03'],
    });
  });

  it('dentro del umbral no avisa', async () => {
    mocks.countStarted.mockResolvedValue({ total: 10, noShows: 2 });
    await checkProviderNoShowRate('prov-1', NOW);
    expect(mocks.captureMessage).not.toHaveBeenCalled();
  });

  it('con Sentry apagado solo deja log', async () => {
    mocks.sentryEnabled.mockReturnValue(false);
    mocks.countStarted.mockResolvedValue({ total: 5, noShows: 5 });
    await checkProviderNoShowRate('prov-1', NOW);
    expect(mocks.captureMessage).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('nunca lanza: un fallo de BD o de Sentry solo deja log', async () => {
    mocks.countStarted.mockRejectedValue(new Error('db down'));
    await expect(checkProviderNoShowRate('prov-1', NOW)).resolves.toBeUndefined();

    mocks.countStarted.mockResolvedValue({ total: 5, noShows: 5 });
    mocks.captureMessage.mockImplementation(() => {
      throw new Error('sentry down');
    });
    await expect(checkProviderNoShowRate('prov-1', NOW)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
