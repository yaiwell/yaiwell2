/**
 * Tests de `toggleServiceActiveAction` frente al límite de servicios del plan.
 *
 * Mockeamos Prisma (con una transacción que ejecuta el callback) y el
 * módulo de límites: lo que se protege es que reactivar un servicio pasa
 * por el cupo y que el resultado llega al panel como `PLAN_LIMIT_REACHED`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireCurrentProviderMock, assertCanPublishMock, LimitError, prismaMock, txMock } =
  vi.hoisted(() => {
    const txMock = { service: { update: vi.fn(), updateMany: vi.fn() } };
    return {
      requireCurrentProviderMock: vi.fn(),
      assertCanPublishMock: vi.fn(),
      LimitError: class PlanServiceLimitReachedError extends Error {},
      txMock,
      prismaMock: {
        service: { findUnique: vi.fn(), update: vi.fn() },
        $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
      },
    };
  });

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ requireCurrentProvider: requireCurrentProviderMock }));
vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/services/billing/billing.plan-limits', () => ({
  assertCanPublishService: assertCanPublishMock,
  PlanServiceLimitReachedError: LimitError,
}));

import { toggleServiceActiveAction } from './actions';

/** Servicio del negocio autenticado con el estado indicado. */
function existing(isActive: boolean) {
  return { id: 'service-1', providerId: 'provider-1', deletedAt: null, isActive };
}

describe('toggleServiceActiveAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentProviderMock.mockResolvedValue({ id: 'provider-1' });
    assertCanPublishMock.mockResolvedValue({ activeCount: 0, maxServices: 1 });
    txMock.service.update.mockResolvedValue({ id: 'service-1' });
    // Por defecto el servicio está pausado dentro de la transacción.
    txMock.service.updateMany.mockResolvedValue({ count: 0 });
  });

  it('devuelve PLAN_LIMIT_REACHED y no activa si el plan está lleno', async () => {
    prismaMock.service.findUnique.mockResolvedValue(existing(false));
    assertCanPublishMock.mockRejectedValueOnce(new LimitError());

    const result = await toggleServiceActiveAction('es', 'service-1', true);

    expect(result).toEqual({ ok: false, code: 'PLAN_LIMIT_REACHED' });
    expect(txMock.service.update).not.toHaveBeenCalled();
  });

  it('al activar comprueba el cupo y limpia pausedByPlanAt', async () => {
    prismaMock.service.findUnique.mockResolvedValue(existing(false));

    const result = await toggleServiceActiveAction('es', 'service-1', true);

    expect(result).toEqual({ ok: true });
    expect(assertCanPublishMock).toHaveBeenCalledWith(txMock, 'provider-1');
    expect(txMock.service.update).toHaveBeenCalledWith({
      where: { id: 'service-1' },
      data: { isActive: true, pausedByPlanAt: null },
    });
  });

  it('pausar no consulta el cupo', async () => {
    prismaMock.service.findUnique.mockResolvedValue(existing(true));

    const result = await toggleServiceActiveAction('es', 'service-1', false);

    expect(result).toEqual({ ok: true });
    expect(assertCanPublishMock).not.toHaveBeenCalled();
    expect(txMock.service.update).toHaveBeenCalledWith({
      where: { id: 'service-1' },
      data: { isActive: false, pausedByPlanAt: null },
    });
  });

  it('reactivar uno ya activo es idempotente aunque el plan esté lleno', async () => {
    prismaMock.service.findUnique.mockResolvedValue(existing(true));
    txMock.service.updateMany.mockResolvedValue({ count: 1 });
    assertCanPublishMock.mockRejectedValue(new LimitError());

    const result = await toggleServiceActiveAction('es', 'service-1', true);

    expect(result).toEqual({ ok: true });
    expect(txMock.service.updateMany).toHaveBeenCalledWith({
      where: { id: 'service-1', isActive: true, deletedAt: null },
      data: { pausedByPlanAt: null },
    });
    expect(assertCanPublishMock).not.toHaveBeenCalled();
    expect(txMock.service.update).not.toHaveBeenCalled();
  });

  it('si el sync lo ocultó tras la lectura inicial, activar pasa por el cupo', async () => {
    // Fuera de la transacción se leyó activo; dentro ya no lo está.
    prismaMock.service.findUnique.mockResolvedValue(existing(true));
    txMock.service.updateMany.mockResolvedValue({ count: 0 });
    assertCanPublishMock.mockRejectedValueOnce(new LimitError());

    const result = await toggleServiceActiveAction('es', 'service-1', true);

    expect(result).toEqual({ ok: false, code: 'PLAN_LIMIT_REACHED' });
    expect(assertCanPublishMock).toHaveBeenCalledWith(txMock, 'provider-1');
    expect(txMock.service.update).not.toHaveBeenCalled();
  });

  it('rechaza servicios de otro negocio sin tocar el cupo', async () => {
    prismaMock.service.findUnique.mockResolvedValue({
      ...existing(false),
      providerId: 'provider-2',
    });

    const result = await toggleServiceActiveAction('es', 'service-1', true);

    expect(result).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
