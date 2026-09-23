/**
 * Tests del servicio `plans`.
 *
 * Mockeamos el singleton Prisma para no tocar BD. Cubrimos:
 *  - que el catálogo devuelto es exactamente lo que hay en la tabla
 *    (ninguna cifra sale de una constante del código),
 *  - que una tabla vacía lanza `PlansNotSeededError` en vez de caer a
 *    tarifas por defecto,
 *  - que un tier desconocido se descarta sin tumbar la landing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    plan: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';

import { listPublicPlans, PlansNotSeededError } from './index';

const findManyMock = vi.mocked(prisma.plan.findMany);

/**
 * Adapta filas parciales al tipo que Prisma genera para `findMany`.
 * El cast es inevitable: el tipo por defecto exige el modelo completo
 * (id, timestamps, ids de Stripe) mientras el service usa un `select`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function planRows(rows: Array<Record<string, unknown>>): any {
  return rows;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listPublicPlans', () => {
  it('devuelve las tarifas tal cual están en BD', async () => {
    // Valores deliberadamente distintos de cualquier tarifa comercial
    // conocida: si el servicio devolviera constantes, este test caería.
    findManyMock.mockResolvedValue(
      planRows([
        { tier: 'free', monthlyPriceCents: 0, commissionRateBps: 1111, maxServices: 1 },
        { tier: 'pro', monthlyPriceCents: 4242, commissionRateBps: 950, maxServices: 50 },
      ]),
    );

    const plans = await listPublicPlans();

    expect(plans).toEqual([
      { tier: 'free', monthlyPriceCents: 0, commissionRateBps: 1111, maxServices: 1 },
      { tier: 'pro', monthlyPriceCents: 4242, commissionRateBps: 950, maxServices: 50 },
    ]);
  });

  it('pide los planes ordenados por cuota ascendente', async () => {
    findManyMock.mockResolvedValue(
      planRows([{ tier: 'free', monthlyPriceCents: 0, commissionRateBps: 1200, maxServices: 1 }]),
    );

    await listPublicPlans();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { monthlyPriceCents: 'asc' } }),
    );
  });

  it('lanza PlansNotSeededError si la tabla está vacía', async () => {
    findManyMock.mockResolvedValue(planRows([]));

    await expect(listPublicPlans()).rejects.toBeInstanceOf(PlansNotSeededError);
    await expect(listPublicPlans()).rejects.toMatchObject({ code: 'PLANS_NOT_SEEDED' });
  });

  it('descarta tiers que la UI no sabe pintar', async () => {
    findManyMock.mockResolvedValue(
      planRows([
        { tier: 'free', monthlyPriceCents: 0, commissionRateBps: 1200, maxServices: 1 },
        {
          tier: 'enterprise',
          monthlyPriceCents: 29900,
          commissionRateBps: 300,
          maxServices: 9999,
        },
      ]),
    );

    const plans = await listPublicPlans();

    expect(plans.map((plan) => plan.tier)).toEqual(['free']);
  });
});
