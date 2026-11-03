/**
 * Lecturas del panel de equipo: estados (activo, fuera de plan, de baja),
 * servicios sin nadie y cupo por negocio.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repo, prismaMock } = vi.hoisted(() => ({
  repo: {
    findMembers: vi.fn(),
    findMaxProfessionals: vi.fn(),
    findServicesWithStaff: vi.fn(),
    findMember: vi.fn(),
    findFutureActiveBookings: vi.fn(),
    findServiceOptions: vi.fn(),
    findActiveIds: vi.fn(),
  },
  prismaMock: {},
}));

vi.mock('./team.repository', () => ({ teamRepository: repo }));
vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));

import { getBookableProfessionalIds } from './team.bookable';
import {
  getTeamOverview,
  listActiveProfessionalOptions,
  listBlockingBookings,
} from './team.queries';

const PROVIDER = 'prov-1';

/** Miembros por antigüedad; `inactive` = de baja. */
function members(rows: { id: string; inactive?: boolean; services?: number }[]) {
  repo.findMembers.mockResolvedValue(
    rows.map((r) => ({
      id: r.id,
      name: r.id.toUpperCase(),
      photo: null,
      deletedAt: r.inactive ? new Date() : null,
      _count: { serviceLinks: r.services ?? 0 },
    })),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.findServicesWithStaff.mockResolvedValue([]);
});

describe('getTeamOverview', () => {
  it('al bajar de plan solo cuentan los N más antiguos activos', async () => {
    members([{ id: 'a' }, { id: 'old', inactive: true }, { id: 'b' }, { id: 'c' }, { id: 'd' }]);
    repo.findMaxProfessionals.mockResolvedValue(3);

    const overview = await getTeamOverview(PROVIDER);

    expect(overview.members.map((m) => [m.id, m.status])).toEqual([
      ['a', 'active'],
      ['old', 'inactive'],
      ['b', 'active'],
      ['c', 'active'],
      ['d', 'outOfPlan'],
    ]);
    // El contador solo cuenta a los que entran en el cupo (no «4 de 3»).
    expect(overview.activeCount).toBe(3);
    expect(overview.maxProfessionals).toBe(3);
  });

  it('avisa de los servicios publicados que solo presta alguien fuera de plan', async () => {
    members([{ id: 'a' }, { id: 'b' }]);
    repo.findMaxProfessionals.mockResolvedValue(1);
    repo.findServicesWithStaff.mockResolvedValue([
      { id: 's1', name: { es: 'Corte' }, isActive: true, professionals: [{ professionalId: 'a' }] },
      { id: 's2', name: { es: 'Tinte' }, isActive: true, professionals: [{ professionalId: 'b' }] },
      { id: 's3', name: { es: 'Pausado' }, isActive: false, professionals: [] },
    ]);

    const overview = await getTeamOverview(PROVIDER);

    expect(overview.unstaffedServices).toEqual([{ id: 's2', name: { es: 'Tinte' } }]);
  });

  it('Premium (sin límite) no deja a nadie fuera', async () => {
    members([{ id: 'a' }, { id: 'b' }]);
    repo.findMaxProfessionals.mockResolvedValue(null);

    const overview = await getTeamOverview(PROVIDER);

    expect(overview.members.every((m) => m.status === 'active')).toBe(true);
    expect(overview.maxProfessionals).toBeNull();
  });
});

describe('listActiveProfessionalOptions', () => {
  it('lista solo activos y marca los de fuera de plan', async () => {
    members([{ id: 'a' }, { id: 'x', inactive: true }, { id: 'b' }]);
    repo.findMaxProfessionals.mockResolvedValue(1);

    await expect(listActiveProfessionalOptions(PROVIDER)).resolves.toEqual([
      { id: 'a', name: 'A', outOfPlan: false },
      { id: 'b', name: 'B', outOfPlan: true },
    ]);
  });
});

describe('listBlockingBookings', () => {
  it('no lee citas de un profesional de otro negocio', async () => {
    repo.findMember.mockResolvedValue(null);

    await expect(listBlockingBookings(PROVIDER, 'ajeno')).resolves.toEqual([]);
    expect(repo.findFutureActiveBookings).not.toHaveBeenCalled();
  });
});

describe('getBookableProfessionalIds', () => {
  it('aplica el cupo del plan sobre los activos por antigüedad', async () => {
    repo.findMaxProfessionals.mockResolvedValue(2);
    repo.findActiveIds.mockResolvedValue(['a', 'b', 'c']);

    await expect(getBookableProfessionalIds(PROVIDER)).resolves.toEqual(['a', 'b']);
    expect(repo.findActiveIds).toHaveBeenCalledWith(PROVIDER, prismaMock);
  });

  it('pasa la transacción del caller a las lecturas', async () => {
    const tx = { marker: 'tx' } as never;
    repo.findMaxProfessionals.mockResolvedValue(null);
    repo.findActiveIds.mockResolvedValue(['a', 'b']);

    await expect(getBookableProfessionalIds(PROVIDER, tx)).resolves.toEqual(['a', 'b']);
    expect(repo.findMaxProfessionals).toHaveBeenCalledWith(PROVIDER, tx);
    expect(repo.findActiveIds).toHaveBeenCalledWith(PROVIDER, tx);
  });

  it('negocio inexistente: nadie reservable', async () => {
    repo.findMaxProfessionals.mockResolvedValue(undefined);
    repo.findActiveIds.mockResolvedValue(['a']);

    await expect(getBookableProfessionalIds(PROVIDER)).resolves.toEqual([]);
  });
});
