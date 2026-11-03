/**
 * Tests de la lectura pública del equipo (CLAUDE.md §4.bis «Equipo»).
 *
 * Con Prisma mockeado fijamos lo que no se ve en un test de UI: qué
 * filtros se piden (bajas fuera, servicios publicados), que la ficha y
 * la página de servicio traen quién presta cada servicio en la misma
 * lectura (sin N+1), que solo aparece quien entra en el cupo del plan
 * (mismo corte que el motor) y que al público solo llegan nombre, foto
 * y bio.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, bookableIds } = vi.hoisted(() => ({
  prismaMock: {
    professional: { findMany: vi.fn() },
    booking: { findFirst: vi.fn() },
    service: { findMany: vi.fn(), findFirst: vi.fn() },
  },
  bookableIds: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/services/team/team.bookable', () => ({ getBookableProfessionalIds: bookableIds }));

import { mapPublicProfessional } from './providers.mapper';
import { providersRepository } from './providers.repository';
import { findBookedProfessional, findPublicTeamByProvider } from './providers.team';

const SERVICE_ROW = {
  id: 'svc-1',
  providerId: 'prov-1',
  categoryId: 'cat-1',
  name: { es: 'Corte', ca: 'Tall' },
  description: { es: '', ca: '' },
  durationMinutes: 45,
  priceCents: 3500,
  category: { id: 'cat-1', slug: 'pelo', name: { es: 'Pelo', ca: 'Cabell' }, parentId: null },
  professionals: [
    { professional: { id: 'pro-1', name: ' Laia ', photo: 'https://x/laia.jpg', bio: '  ' } },
    { professional: { id: 'pro-2', name: 'Marc', photo: '', bio: 'Barbero.' } },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  bookableIds.mockResolvedValue(['pro-1', 'pro-2']);
});

describe('mapPublicProfessional', () => {
  it('solo expone id, nombre, foto y bio, con vacíos como null', () => {
    const mapped = mapPublicProfessional({
      id: 'pro-1',
      name: ' Laia ',
      photo: '   ',
      bio: '',
      // Campos privados que una `select` descuidada podría traer.
      ...({ userId: 'user-1', schedule: {} } as object),
    } as { id: string; name: string; photo: string | null; bio: string | null });

    expect(mapped).toEqual({ id: 'pro-1', name: 'Laia', photo: null, bio: null });
  });
});

describe('findPublicTeamByProvider', () => {
  it('pide solo profesionales activos con algún servicio publicado, por antigüedad', async () => {
    prismaMock.professional.findMany.mockResolvedValue([
      { id: 'pro-1', name: 'Laia', photo: null, bio: 'Colorista.' },
    ]);

    const team = await findPublicTeamByProvider('prov-1');

    expect(team).toEqual([{ id: 'pro-1', name: 'Laia', photo: null, bio: 'Colorista.' }]);
    const args = prismaMock.professional.findMany.mock.calls[0]![0];
    expect(args.where).toEqual({
      providerId: 'prov-1',
      deletedAt: null,
      serviceLinks: { some: { service: { deletedAt: null, isActive: true } } },
    });
    expect(args.orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
    expect(args.select).toEqual({ id: true, name: true, photo: true, bio: true });
    expect(bookableIds).toHaveBeenCalledWith('prov-1');
  });

  it('deja fuera a quien está fuera del cupo del plan', async () => {
    // Plan de 1: solo el más antiguo acepta reservas.
    bookableIds.mockResolvedValue(['pro-1']);
    prismaMock.professional.findMany.mockResolvedValue([
      { id: 'pro-1', name: 'Laia', photo: null, bio: null },
      { id: 'pro-2', name: 'Marc', photo: null, bio: null },
    ]);

    const team = await findPublicTeamByProvider('prov-1');

    expect(team.map((p) => p.id)).toEqual(['pro-1']);
  });
});

describe('findBookedProfessional', () => {
  it('filtra por cliente (titularidad) y devuelve el profesional público', async () => {
    prismaMock.booking.findFirst.mockResolvedValue({
      professional: { id: 'pro-9', name: 'Ana', photo: null, bio: null },
    });

    await expect(findBookedProfessional('bk-1', 'user-1')).resolves.toEqual({
      id: 'pro-9',
      name: 'Ana',
      photo: null,
      bio: null,
    });
    expect(prismaMock.booking.findFirst.mock.calls[0]![0].where).toEqual({
      id: 'bk-1',
      clientId: 'user-1',
    });
  });

  it('reserva ajena o inexistente → null', async () => {
    prismaMock.booking.findFirst.mockResolvedValue(null);
    await expect(findBookedProfessional('bk-x', 'user-1')).resolves.toBeNull();
  });
});

describe('providersRepository — quién presta cada servicio', () => {
  it('la ficha trae los profesionales de cada servicio en la misma consulta', async () => {
    prismaMock.service.findMany.mockResolvedValue([SERVICE_ROW]);

    const [service] = await providersRepository.findServicesByProvider('prov-1');

    expect(prismaMock.service.findMany).toHaveBeenCalledTimes(1);
    const select = prismaMock.service.findMany.mock.calls[0]![0].select;
    expect(select.professionals.where).toEqual({ professional: { deletedAt: null } });
    expect(service!.professionals).toEqual([
      { id: 'pro-1', name: 'Laia', photo: 'https://x/laia.jpg', bio: null },
      { id: 'pro-2', name: 'Marc', photo: null, bio: 'Barbero.' },
    ]);
  });

  it('la página de servicio devuelve servicio y profesionales por separado', async () => {
    prismaMock.service.findFirst.mockResolvedValue(SERVICE_ROW);

    const found = await providersRepository.findServiceByProvider('prov-1', 'svc-1');

    expect(found?.service).toMatchObject({ id: 'svc-1', priceCents: 3500 });
    expect(found?.service).not.toHaveProperty('professionals');
    expect(found?.professionals.map((p) => p.id)).toEqual(['pro-1', 'pro-2']);
  });

  it('ficha y página de servicio ocultan al profesional fuera de plan', async () => {
    bookableIds.mockResolvedValue(['pro-1']);
    prismaMock.service.findMany.mockResolvedValue([SERVICE_ROW]);
    prismaMock.service.findFirst.mockResolvedValue(SERVICE_ROW);

    const [service] = await providersRepository.findServicesByProvider('prov-1');
    const found = await providersRepository.findServiceByProvider('prov-1', 'svc-1');

    expect(service!.professionals.map((p) => p.id)).toEqual(['pro-1']);
    expect(found?.professionals.map((p) => p.id)).toEqual(['pro-1']);
    // Una lectura del cupo por página, no una por servicio.
    expect(bookableIds).toHaveBeenCalledTimes(2);
  });
});
