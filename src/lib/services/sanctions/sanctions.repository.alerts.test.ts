/**
 * Test de la consulta de la alerta de no presentados: reservas en el
 * local del negocio que ya empezaron en la ventana (completed, no_show y
 * confirmed pasadas) y cuántas son `no_show`.
 */

import { describe, expect, it, vi } from 'vitest';

const { countMock } = vi.hoisted(() => ({ countMock: vi.fn() }));

vi.mock('@/lib/db/prisma', () => ({ prisma: { booking: { count: countMock } } }));

import { sanctionsRepository } from './sanctions.repository';

const SINCE = new Date('2026-10-03T10:00:00.000Z');
const NOW = new Date('2026-11-02T10:00:00.000Z');

describe('sanctionsRepository.countOnsiteStartedSince', () => {
  it('cuenta las ya empezadas en el local y, aparte, las no presentadas', async () => {
    countMock.mockResolvedValueOnce(8).mockResolvedValueOnce(3);
    await expect(
      sanctionsRepository.countOnsiteStartedSince('prov-1', SINCE, NOW),
    ).resolves.toEqual({ total: 8, noShows: 3 });

    const base = { providerId: 'prov-1', paymentMode: 'onsite', startAt: { gte: SINCE, lte: NOW } };
    expect(countMock).toHaveBeenNthCalledWith(1, {
      where: { ...base, status: { in: ['completed', 'no_show', 'confirmed'] } },
    });
    expect(countMock).toHaveBeenNthCalledWith(2, { where: { ...base, status: 'no_show' } });
  });
});
