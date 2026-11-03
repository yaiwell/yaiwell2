/**
 * Server actions del equipo: siempre con el negocio de la sesión, ids
 * validados y errores del dominio traducidos a códigos opacos.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

const { requireCurrentProviderMock, redirectMock, revalidateMock, team } = vi.hoisted(() => {
  class Base extends Error {}
  return {
    requireCurrentProviderMock: vi.fn(),
    redirectMock: vi.fn(),
    revalidateMock: vi.fn(),
    team: {
      createProfessional: vi.fn(),
      updateProfessional: vi.fn(),
      deactivateProfessional: vi.fn(),
      reactivateProfessional: vi.fn(),
      LastActiveProfessionalError: class LastActiveProfessionalError extends Base {},
      PlanProfessionalLimitError: class PlanProfessionalLimitError extends Base {},
      ProfessionalHasFutureBookingsError: class ProfessionalHasFutureBookingsError extends Base {
        constructor(readonly bookings: { id: string; startAt: Date; serviceName: object }[]) {
          super();
        }
      },
      ProfessionalInactiveError: class ProfessionalInactiveError extends Base {},
      ProfessionalNotFoundError: class ProfessionalNotFoundError extends Base {},
      ProfessionalPhotoInvalidError: class ProfessionalPhotoInvalidError extends Base {},
      ServicesWouldBeUnstaffedError: class ServicesWouldBeUnstaffedError extends Base {
        constructor(readonly services: { id: string; name: object }[]) {
          super();
        }
      },
      TeamProviderNotFoundError: class TeamProviderNotFoundError extends Base {},
      TeamServicesInvalidError: class TeamServicesInvalidError extends Base {},
    },
  };
});

vi.mock('next/cache', () => ({ revalidatePath: revalidateMock }));
vi.mock('@/i18n/navigation', () => ({ redirect: redirectMock }));
vi.mock('@/lib/auth/server', () => ({ requireCurrentProvider: requireCurrentProviderMock }));
vi.mock('@/lib/services/team', async () => {
  const validation = await import('@/lib/services/team/team.validation');
  return { ...team, teamIdSchema: validation.teamIdSchema };
});

import {
  createProfessionalAction,
  deactivateProfessionalAction,
  reactivateProfessionalAction,
  updateProfessionalAction,
} from './actions';

const RAW = {
  name: 'Laura',
  bio: '',
  photo: null,
  schedule: {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  },
  serviceIds: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentProviderMock.mockResolvedValue({ id: 'provider-1' });
});

describe('createProfessionalAction', () => {
  it('crea con el negocio de la sesión y vuelve al listado', async () => {
    await createProfessionalAction('es', RAW);

    expect(team.createProfessional).toHaveBeenCalledWith('provider-1', RAW);
    expect(revalidateMock).toHaveBeenCalledWith('/es/panel/equipo');
    expect(redirectMock).toHaveBeenCalledWith({ href: '/panel/equipo', locale: 'es' });
  });

  it('traduce el límite del plan a PLAN_LIMIT sin redirigir', async () => {
    team.createProfessional.mockRejectedValueOnce(new team.PlanProfessionalLimitError());

    await expect(createProfessionalAction('es', RAW)).resolves.toEqual({
      ok: false,
      code: 'PLAN_LIMIT',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('traduce ZodError a VALIDATION', async () => {
    team.createProfessional.mockRejectedValueOnce(new ZodError([]));

    await expect(createProfessionalAction('es', RAW)).resolves.toEqual({
      ok: false,
      code: 'VALIDATION',
    });
  });
});

describe('updateProfessionalAction', () => {
  it('un id de otro negocio sale NOT_FOUND', async () => {
    team.updateProfessional.mockRejectedValueOnce(new team.ProfessionalNotFoundError());

    await expect(updateProfessionalAction('es', 'ajeno', RAW)).resolves.toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(team.updateProfessional).toHaveBeenCalledWith('provider-1', 'ajeno', RAW);
  });

  it('un id malformado no llega al servicio', async () => {
    const result = await updateProfessionalAction('es', 'x'.repeat(200), RAW);

    expect(result).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect(team.updateProfessional).not.toHaveBeenCalled();
  });

  it('devuelve los servicios que se quedarían sin nadie', async () => {
    team.updateProfessional.mockRejectedValueOnce(
      new team.ServicesWouldBeUnstaffedError([{ id: 's1', name: { es: 'Corte' } }]),
    );

    await expect(updateProfessionalAction('es', 'pro-1', RAW)).resolves.toEqual({
      ok: false,
      code: 'UNSTAFFED_SERVICES',
      services: [{ id: 's1', name: { es: 'Corte' } }],
    });
  });

  it('revalida la ficha y el listado al guardar', async () => {
    await expect(updateProfessionalAction('ca', 'pro-1', RAW)).resolves.toEqual({ ok: true });

    expect(revalidateMock).toHaveBeenCalledWith('/ca/panel/equipo/pro-1');
  });
});

describe('deactivateProfessionalAction', () => {
  it('devuelve las citas futuras serializadas', async () => {
    team.deactivateProfessional.mockRejectedValueOnce(
      new team.ProfessionalHasFutureBookingsError([
        { id: 'bk-1', startAt: new Date('2026-11-05T09:00:00.000Z'), serviceName: { es: 'Corte' } },
      ]),
    );

    await expect(deactivateProfessionalAction('es', 'pro-1')).resolves.toEqual({
      ok: false,
      code: 'HAS_FUTURE_BOOKINGS',
      bookings: [{ id: 'bk-1', startAt: '2026-11-05T09:00:00.000Z', serviceName: { es: 'Corte' } }],
    });
  });

  it('traduce el último activo a LAST_ACTIVE', async () => {
    team.deactivateProfessional.mockRejectedValueOnce(new team.LastActiveProfessionalError());

    await expect(deactivateProfessionalAction('es', 'pro-1')).resolves.toMatchObject({
      code: 'LAST_ACTIVE',
    });
  });
});

describe('reactivateProfessionalAction', () => {
  it('traduce el límite del plan a PLAN_LIMIT', async () => {
    team.reactivateProfessional.mockRejectedValueOnce(new team.PlanProfessionalLimitError());

    await expect(reactivateProfessionalAction('es', 'pro-1')).resolves.toEqual({
      ok: false,
      code: 'PLAN_LIMIT',
    });
  });

  it('un error desconocido sale INTERNAL', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    team.reactivateProfessional.mockRejectedValueOnce(new Error('boom'));

    await expect(reactivateProfessionalAction('es', 'pro-1')).resolves.toEqual({
      ok: false,
      code: 'INTERNAL',
    });
  });
});

describe('locale', () => {
  it('un locale que no es de la app sale VALIDATION sin tocar sesión ni servicio', async () => {
    const bad = 'xx' as never;

    await expect(createProfessionalAction(bad, RAW)).resolves.toEqual({
      ok: false,
      code: 'VALIDATION',
    });
    await expect(updateProfessionalAction(bad, 'a', RAW)).resolves.toMatchObject({ ok: false });
    await expect(deactivateProfessionalAction(bad, 'a')).resolves.toMatchObject({ ok: false });
    await expect(reactivateProfessionalAction(bad, 'a')).resolves.toMatchObject({ ok: false });

    expect(requireCurrentProviderMock).not.toHaveBeenCalled();
    expect(team.createProfessional).not.toHaveBeenCalled();
    expect(team.updateProfessional).not.toHaveBeenCalled();
    expect(team.deactivateProfessional).not.toHaveBeenCalled();
    expect(team.reactivateProfessional).not.toHaveBeenCalled();
    expect(revalidateMock).not.toHaveBeenCalled();
  });
});
