/**
 * Baja y reactivación de profesionales (CLAUDE.md §4.bis «Equipo»):
 * propiedad, límite del plan, citas futuras, servicios que se quedarían
 * sin nadie y retirada de sus ofertas de hueco.
 *
 * Se mockean Prisma (la transacción ejecuta el callback), el repositorio
 * del equipo y la puerta de asignación servicio ↔ profesionales.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repo, onboarding, tx } = vi.hoisted(() => ({
  tx: { marker: 'tx' },
  repo: {
    findMember: vi.fn(),
    countOwnServices: vi.fn(),
    lockProviderPlan: vi.fn(),
    findServicesWithStaff: vi.fn(),
    findFutureActiveBookings: vi.fn(),
    lockProfessionalAgenda: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setDeletedAt: vi.fn(),
    withdrawOpenOffers: vi.fn(),
  },
  onboarding: {
    serviceTeamRepository: {
      findActiveProfessionalIds: vi.fn(),
      replaceServiceProfessionals: vi.fn(),
    },
    syncServiceProfessionals: vi.fn(),
  },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: { $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)) },
}));
vi.mock('./team.repository', () => ({ teamRepository: repo }));
vi.mock('@/lib/services/provider-onboarding', () => onboarding);

import {
  LastActiveProfessionalError,
  PlanProfessionalLimitError,
  ProfessionalHasFutureBookingsError,
  ProfessionalNotFoundError,
  ServicesWouldBeUnstaffedError,
} from './team.errors';
import { deactivateProfessional, reactivateProfessional } from './team.lifecycle';

const PROVIDER = 'prov-1';
const OPEN = { open: '09:00', close: '18:00' };
const SCHEDULE = {
  monday: [OPEN],
  tuesday: [OPEN],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

/** Equipo en BD: activos por antigüedad, cupo y servicios con su personal. */
function team(
  activeIds: string[],
  max: number | null,
  services: { id: string; isActive?: boolean; staff: string[] }[] = [],
) {
  repo.lockProviderPlan.mockResolvedValue(max);
  onboarding.serviceTeamRepository.findActiveProfessionalIds.mockResolvedValue(activeIds);
  repo.findServicesWithStaff.mockResolvedValue(
    services.map((s) => ({
      id: s.id,
      name: { es: s.id },
      isActive: s.isActive ?? true,
      professionals: s.staff.map((professionalId) => ({ professionalId })),
    })),
  );
}

/** Profesional del negocio tal como lo devuelve `findMember`. */
function member(id: string, deletedAt: Date | null = null) {
  return { id, name: id, photo: null, bio: null, schedule: SCHEDULE, deletedAt, serviceLinks: [] };
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.countOwnServices.mockImplementation(async (_p: string, ids: string[]) => ids.length);
  repo.create.mockResolvedValue({ id: 'new' });
  repo.findFutureActiveBookings.mockResolvedValue([]);
});

describe('deactivateProfessional', () => {
  const NOW = new Date('2026-11-03T10:00:00.000Z');

  it('un id de otro negocio es NOT_FOUND', async () => {
    repo.findMember.mockResolvedValue(null);

    await expect(deactivateProfessional(PROVIDER, 'ajeno', NOW)).rejects.toBeInstanceOf(
      ProfessionalNotFoundError,
    );
  });

  it('prohíbe la baja con citas futuras y devuelve la lista', async () => {
    repo.findMember.mockResolvedValue(member('a'));
    team(['a', 'b'], 3);
    repo.findFutureActiveBookings.mockResolvedValue([
      { id: 'bk-1', startAt: new Date('2026-11-05T09:00:00Z'), service: { name: { es: 'Corte' } } },
    ]);

    const error = await deactivateProfessional(PROVIDER, 'a', NOW).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProfessionalHasFutureBookingsError);
    expect((error as ProfessionalHasFutureBookingsError).bookings).toEqual([
      { id: 'bk-1', startAt: new Date('2026-11-05T09:00:00Z'), serviceName: { es: 'Corte' } },
    ]);
    expect(repo.lockProfessionalAgenda).toHaveBeenCalledWith('a', tx);
    expect(repo.findFutureActiveBookings).toHaveBeenCalledWith('a', NOW, tx);
    expect(repo.setDeletedAt).not.toHaveBeenCalled();
  });

  it('prohíbe dar de baja al último activo', async () => {
    repo.findMember.mockResolvedValue(member('a'));
    team(['a'], 3);

    await expect(deactivateProfessional(PROVIDER, 'a', NOW)).rejects.toBeInstanceOf(
      LastActiveProfessionalError,
    );
  });

  it('prohíbe dejar un servicio publicado sin nadie', async () => {
    repo.findMember.mockResolvedValue(member('a'));
    team(['a', 'b'], 3, [{ id: 's1', staff: ['a'] }]);

    await expect(deactivateProfessional(PROVIDER, 'a', NOW)).rejects.toBeInstanceOf(
      ServicesWouldBeUnstaffedError,
    );
  });

  it('cuenta el cupo liberado: quien estaba fuera de plan vuelve a cubrir', async () => {
    repo.findMember.mockResolvedValue(member('a'));
    // Plan de 1: «b» está fuera de plan hasta que «a» se va.
    team(['a', 'b'], 1, [{ id: 's1', staff: ['a', 'b'] }]);

    await deactivateProfessional(PROVIDER, 'a', NOW);

    expect(repo.setDeletedAt).toHaveBeenCalledWith('a', NOW, tx);
  });

  it('retira sus ofertas de hueco abiertas en la misma transacción', async () => {
    repo.findMember.mockResolvedValue(member('a'));
    team(['a', 'b'], 3, [{ id: 's1', staff: ['a', 'b'] }]);

    await deactivateProfessional(PROVIDER, 'a', NOW);

    expect(repo.withdrawOpenOffers).toHaveBeenCalledWith('a', NOW, tx);
  });

  it('si la baja se rechaza no retira ninguna oferta', async () => {
    repo.findMember.mockResolvedValue(member('a'));
    team(['a', 'b'], 3, [{ id: 's1', staff: ['a'] }]);

    await expect(deactivateProfessional(PROVIDER, 'a', NOW)).rejects.toBeInstanceOf(
      ServicesWouldBeUnstaffedError,
    );
    expect(repo.withdrawOpenOffers).not.toHaveBeenCalled();
  });

  it('es idempotente si ya estaba de baja', async () => {
    repo.findMember.mockResolvedValue(member('a', new Date()));

    await deactivateProfessional(PROVIDER, 'a', NOW);

    expect(repo.setDeletedAt).not.toHaveBeenCalled();
    expect(repo.withdrawOpenOffers).not.toHaveBeenCalled();
  });
});

describe('reactivateProfessional', () => {
  it('rechaza con PlanProfessionalLimitError si el plan está lleno', async () => {
    repo.findMember.mockResolvedValue(member('z', new Date()));
    team(['a', 'b', 'c'], 3);

    await expect(reactivateProfessional(PROVIDER, 'z')).rejects.toBeInstanceOf(
      PlanProfessionalLimitError,
    );
    expect(repo.setDeletedAt).not.toHaveBeenCalled();
  });

  it('reactiva si hay cupo', async () => {
    repo.findMember.mockResolvedValue(member('z', new Date()));
    team(['a'], 3);

    await reactivateProfessional(PROVIDER, 'z');

    expect(repo.setDeletedAt).toHaveBeenCalledWith('z', null, tx);
  });

  it('un id de otro negocio es NOT_FOUND', async () => {
    repo.findMember.mockResolvedValue(null);

    await expect(reactivateProfessional(PROVIDER, 'ajeno')).rejects.toBeInstanceOf(
      ProfessionalNotFoundError,
    );
  });
});
