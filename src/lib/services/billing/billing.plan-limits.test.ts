/**
 * Tests de los límites de servicios por plan.
 *
 * Usamos una BD en memoria mínima que entiende solo los `where` que usa
 * el módulo: lo que se protege es qué servicios se ocultan o reactivan,
 * no la sintaxis de Prisma.
 */

import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import {
  applyPlanLimits,
  assertCanPublishService,
  PlanLimitProviderNotFoundError,
  PlanServiceLimitReachedError,
} from './billing.plan-limits';

interface FakeService {
  id: string;
  createdAt: Date;
  isActive: boolean;
  deletedAt: Date | null;
  pausedByPlanAt: Date | null;
}

interface FakeWhere {
  id?: { in: string[] };
  isActive?: boolean;
  deletedAt?: null;
  pausedByPlanAt?: { not: null };
}

const NOW = new Date('2026-10-29T10:00:00Z');

/** Servicio de prueba creado el día `day` de octubre. */
function svc(id: string, day: number, patch: Partial<FakeService> = {}): FakeService {
  return {
    id,
    createdAt: new Date(`2026-10-${String(day).padStart(2, '0')}T09:00:00Z`),
    isActive: true,
    deletedAt: null,
    pausedByPlanAt: null,
    ...patch,
  };
}

function matches(s: FakeService, where: FakeWhere): boolean {
  if (where.id && !where.id.in.includes(s.id)) return false;
  if (where.isActive !== undefined && s.isActive !== where.isActive) return false;
  if (where.deletedAt === null && s.deletedAt !== null) return false;
  if (where.pausedByPlanAt && s.pausedByPlanAt === null) return false;
  return true;
}

/** Cliente de transacción falso sobre una lista de servicios. */
function fakeTx(services: FakeService[], maxServices: number | null = 1) {
  const sorted = () => [...services].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const tx = {
    $queryRaw: vi.fn(async () => (maxServices === null ? [] : [{ maxServices }])),
    service: {
      findMany: vi.fn(async (args: { where: FakeWhere; take?: number }) =>
        sorted()
          .filter((s) => matches(s, args.where))
          .slice(0, args.take ?? Infinity)
          .map((s) => ({ id: s.id })),
      ),
      count: vi.fn(
        async (args: { where: FakeWhere }) => services.filter((s) => matches(s, args.where)).length,
      ),
      updateMany: vi.fn(async (args: { where: FakeWhere; data: Partial<FakeService> }) => {
        const hit = services.filter((s) => matches(s, args.where));
        hit.forEach((s) => Object.assign(s, args.data));
        return { count: hit.length };
      }),
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, raw: tx };
}

describe('applyPlanLimits', () => {
  it('al bajar de plan oculta los servicios más nuevos y conserva los más antiguos', async () => {
    const services = [svc('c', 3), svc('a', 1), svc('b', 2)];
    const { tx } = fakeTx(services);

    const result = await applyPlanLimits(tx, 'prov-1', 1, NOW);

    expect(result).toEqual({ hiddenServiceIds: ['b', 'c'], restoredServiceIds: [] });
    expect(services.find((s) => s.id === 'a')).toMatchObject({ isActive: true });
    expect(services.find((s) => s.id === 'b')).toMatchObject({
      isActive: false,
      pausedByPlanAt: NOW,
    });
  });

  it('al subir de plan reactiva solo los ocultos por el plan, más antiguos primero', async () => {
    const services = [
      svc('active', 1),
      svc('manual', 2, { isActive: false }),
      svc('plan-old', 3, { isActive: false, pausedByPlanAt: NOW }),
      svc('plan-new', 4, { isActive: false, pausedByPlanAt: NOW }),
    ];
    const { tx } = fakeTx(services);

    const result = await applyPlanLimits(tx, 'prov-1', 2, NOW);

    expect(result).toEqual({ hiddenServiceIds: [], restoredServiceIds: ['plan-old'] });
    expect(services.find((s) => s.id === 'plan-old')).toMatchObject({
      isActive: true,
      pausedByPlanAt: null,
    });
    expect(services.find((s) => s.id === 'plan-new')).toMatchObject({ isActive: false });
    expect(services.find((s) => s.id === 'manual')).toMatchObject({ isActive: false });
  });

  it('nunca reactiva los pausados a mano aunque sobre cupo', async () => {
    const services = [svc('manual', 1, { isActive: false })];
    const { tx, raw } = fakeTx(services);

    const result = await applyPlanLimits(tx, 'prov-1', 999, NOW);

    expect(result.restoredServiceIds).toEqual([]);
    expect(services[0].isActive).toBe(false);
    expect(raw.service.updateMany).not.toHaveBeenCalled();
  });

  it('ignora los servicios borrados', async () => {
    const services = [
      svc('deleted', 1, { isActive: false, deletedAt: NOW, pausedByPlanAt: NOW }),
      svc('a', 2),
    ];
    const { tx } = fakeTx(services);

    const result = await applyPlanLimits(tx, 'prov-1', 5, NOW);

    expect(result.restoredServiceIds).toEqual([]);
    expect(services[0].isActive).toBe(false);
  });

  it('no toca nada si está justo en el límite', async () => {
    const services = [svc('a', 1), svc('b', 2, { isActive: false, pausedByPlanAt: NOW })];
    const { tx, raw } = fakeTx(services);

    const result = await applyPlanLimits(tx, 'prov-1', 1, NOW);

    expect(result).toEqual({ hiddenServiceIds: [], restoredServiceIds: [] });
    expect(raw.service.updateMany).not.toHaveBeenCalled();
  });
});

describe('assertCanPublishService', () => {
  it('deja publicar mientras queda cupo', async () => {
    const { tx } = fakeTx([svc('a', 1)], 2);

    await expect(assertCanPublishService(tx, 'prov-1')).resolves.toEqual({
      activeCount: 1,
      maxServices: 2,
    });
  });

  it('rechaza justo en el límite', async () => {
    const { tx } = fakeTx([svc('a', 1)], 1);

    const error = await assertCanPublishService(tx, 'prov-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PlanServiceLimitReachedError);
    expect(error).toMatchObject({ code: 'PLAN_LIMIT_REACHED', maxServices: 1 });
  });

  it('no cuenta los pausados ni los borrados', async () => {
    const services = [
      svc('manual', 1, { isActive: false }),
      svc('plan', 2, { isActive: false, pausedByPlanAt: NOW }),
      svc('deleted', 3, { isActive: false, deletedAt: NOW }),
    ];
    const { tx } = fakeTx(services, 1);

    await expect(assertCanPublishService(tx, 'prov-1')).resolves.toMatchObject({
      activeCount: 0,
    });
  });

  it('bloquea la fila del negocio con FOR UPDATE y sin ::uuid', async () => {
    const { tx, raw } = fakeTx([], 1);

    await assertCanPublishService(tx, 'prov-1');

    const [strings, providerId] = raw.$queryRaw.mock.calls[0] as unknown as [string[], string];
    const sql = strings.join('?');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).not.toContain('::uuid');
    expect(providerId).toBe('prov-1');
  });

  it('lanza PlanLimitProviderNotFoundError si el negocio no existe', async () => {
    const { tx } = fakeTx([], null);

    await expect(assertCanPublishService(tx, 'prov-x')).rejects.toBeInstanceOf(
      PlanLimitProviderNotFoundError,
    );
  });
});
