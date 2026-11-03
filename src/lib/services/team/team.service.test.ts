/**
 * Alta y edición de profesionales (CLAUDE.md §4.bis «Equipo»):
 * propiedad, límite del plan y servicios que se quedarían sin nadie.
 * La baja y la reactivación van en `team.lifecycle.test.ts`.
 *
 * Se mockean Prisma (la transacción ejecuta el callback), el repositorio
 * del equipo y la puerta de asignación servicio ↔ profesionales.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

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
  PlanProfessionalLimitError,
  ProfessionalInactiveError,
  ProfessionalNotFoundError,
  ProfessionalPhotoInvalidError,
  ServicesWouldBeUnstaffedError,
  TeamServicesInvalidError,
} from './team.errors';
import { createProfessional, updateProfessional } from './team.service';

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
const INPUT = { name: '  Laura ', bio: '', photo: null, schedule: SCHEDULE, serviceIds: ['s1'] };

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

describe('createProfessional', () => {
  it('crea con nombre recortado y lo asigna a sus servicios', async () => {
    team(['a'], 3, [{ id: 's1', staff: ['a'] }]);

    await expect(createProfessional(PROVIDER, INPUT)).resolves.toBe('new');

    expect(repo.create).toHaveBeenCalledWith(
      PROVIDER,
      expect.objectContaining({ name: 'Laura', bio: null, photo: null }),
      tx,
    );
    expect(onboarding.syncServiceProfessionals).toHaveBeenCalledWith(
      's1',
      PROVIDER,
      ['a', 'new'],
      tx,
    );
  });

  it('rechaza con PlanProfessionalLimitError si el plan está lleno', async () => {
    team(['a', 'b', 'c'], 3);

    await expect(createProfessional(PROVIDER, INPUT)).rejects.toBeInstanceOf(
      PlanProfessionalLimitError,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('sin límite (Premium) no cuenta', async () => {
    team(['a', 'b', 'c', 'd'], null, [{ id: 's1', staff: [] }]);

    await expect(createProfessional(PROVIDER, INPUT)).resolves.toBe('new');
  });

  it('rechaza servicios de otro negocio', async () => {
    repo.countOwnServices.mockResolvedValue(0);

    await expect(createProfessional(PROVIDER, INPUT)).rejects.toBeInstanceOf(
      TeamServicesInvalidError,
    );
  });

  it('rechaza una foto que no viene de la subida del negocio', async () => {
    await expect(
      createProfessional(PROVIDER, { ...INPUT, photo: 'https://evil.example/x.jpg' }),
    ).rejects.toBeInstanceOf(ProfessionalPhotoInvalidError);
  });

  it('valida nombre (1-80) y bio (≤ 300) con Zod', async () => {
    await expect(createProfessional(PROVIDER, { ...INPUT, name: '  ' })).rejects.toBeInstanceOf(
      ZodError,
    );
    await expect(
      createProfessional(PROVIDER, { ...INPUT, bio: 'x'.repeat(301) }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe('updateProfessional', () => {
  it('un id de otro negocio es NOT_FOUND', async () => {
    repo.findMember.mockResolvedValue(null);

    await expect(updateProfessional(PROVIDER, 'ajeno', INPUT)).rejects.toBeInstanceOf(
      ProfessionalNotFoundError,
    );
    expect(repo.findMember).toHaveBeenCalledWith(PROVIDER, 'ajeno');
  });

  it('no edita a quien está de baja', async () => {
    repo.findMember.mockResolvedValue(member('a', new Date()));

    await expect(updateProfessional(PROVIDER, 'a', INPUT)).rejects.toBeInstanceOf(
      ProfessionalInactiveError,
    );
  });

  it('relee al profesional dentro de la transacción: una baja simultánea gana', async () => {
    // Fuera de la transacción aún estaba activo; con el cerrojo, ya de baja.
    repo.findMember
      .mockResolvedValueOnce(member('a'))
      .mockResolvedValueOnce(member('a', new Date()));
    team(['b'], 3, [{ id: 's1', staff: ['b'] }]);

    await expect(updateProfessional(PROVIDER, 'a', INPUT)).rejects.toBeInstanceOf(
      ProfessionalInactiveError,
    );
    expect(repo.findMember).toHaveBeenLastCalledWith(PROVIDER, 'a', tx);
    expect(repo.update).not.toHaveBeenCalled();
    expect(onboarding.syncServiceProfessionals).not.toHaveBeenCalled();
  });

  it('no deja un servicio publicado sin nadie al quitárselo', async () => {
    repo.findMember.mockResolvedValue(member('a'));
    team(['a', 'b'], 3, [
      { id: 's1', staff: ['a', 'b'] },
      { id: 's2', staff: ['a'] },
    ]);

    const error = await updateProfessional(PROVIDER, 'a', INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServicesWouldBeUnstaffedError);
    expect((error as ServicesWouldBeUnstaffedError).services.map((s) => s.id)).toEqual(['s2']);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('guarda y sincroniza solo los servicios que cambian', async () => {
    repo.findMember.mockResolvedValue(member('a'));
    team(['a', 'b'], 3, [
      { id: 's1', staff: ['b'] },
      { id: 's2', staff: ['a', 'b'] },
      { id: 's3', isActive: false, staff: ['a'] },
    ]);

    await updateProfessional(PROVIDER, 'a', INPUT);

    expect(repo.update).toHaveBeenCalledWith('a', expect.objectContaining({ name: 'Laura' }), tx);
    expect(onboarding.syncServiceProfessionals).toHaveBeenCalledWith(
      's1',
      PROVIDER,
      ['b', 'a'],
      tx,
    );
    expect(onboarding.syncServiceProfessionals).toHaveBeenCalledWith('s2', PROVIDER, ['b'], tx);
    // Un servicio pausado sí puede quedarse sin nadie.
    expect(onboarding.serviceTeamRepository.replaceServiceProfessionals).toHaveBeenCalledWith(
      's3',
      [],
      tx,
    );
  });
});
