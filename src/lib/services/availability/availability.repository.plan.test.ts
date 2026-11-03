/**
 * El motor solo ofrece huecos de profesionales dentro del cupo del plan
 * (CLAUDE.md §4.bis «Equipo»: al bajar de plan, los que sobran dejan de
 * aceptar reservas nuevas). Se prueba en el repositorio porque todo
 * (rejilla, «cualquiera», checkout y reserva) lee de aquí.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    service: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));

import {
  ProfessionalNotForServiceError,
  ServiceForAvailabilityNotFoundError,
} from './availability.errors';
import { availabilityRepository } from './availability.repository';
import { getServiceDaySlots } from './availability.service-day';

/** Servicio con su personal y el equipo activo del negocio. */
function serviceRow(staff: string[], team: string[], max: number | null) {
  return {
    id: 'svc-1',
    providerId: 'prov-1',
    durationMinutes: 30,
    professionals: staff.map((professionalId) => ({ professionalId })),
    provider: {
      plan: { maxProfessionals: max },
      professionals: team.map((id) => ({ id })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('findServiceForAvailability con cupo de plan', () => {
  it('deja fuera a quien queda por encima de los N más antiguos', async () => {
    prismaMock.service.findFirst.mockResolvedValue(serviceRow(['a', 'd'], ['a', 'b', 'c', 'd'], 3));

    const service = await availabilityRepository.findServiceForAvailability('svc-1');

    expect(service?.professionalIds).toEqual(['a']);
  });

  it('sin límite (Premium) no filtra a nadie', async () => {
    prismaMock.service.findFirst.mockResolvedValue(
      serviceRow(['a', 'd'], ['a', 'b', 'c', 'd'], null),
    );

    const service = await availabilityRepository.findServiceForAvailability('svc-1');

    expect(service?.professionalIds).toEqual(['a', 'd']);
  });

  it('si todo su personal queda fuera de plan, el servicio no es reservable', async () => {
    prismaMock.service.findFirst.mockResolvedValue(serviceRow(['d'], ['a', 'b', 'c', 'd'], 3));

    await expect(
      getServiceDaySlots('svc-1', new Date('2026-11-04T00:00:00.000Z')),
    ).rejects.toBeInstanceOf(ServiceForAvailabilityNotFoundError);
  });

  it('un profesional fuera de plan no se puede pedir por id', async () => {
    prismaMock.service.findFirst.mockResolvedValue(serviceRow(['a', 'd'], ['a', 'b', 'c', 'd'], 3));

    await expect(
      getServiceDaySlots('svc-1', new Date('2026-11-04T00:00:00.000Z'), new Date(), 'd'),
    ).rejects.toBeInstanceOf(ProfessionalNotForServiceError);
  });
});

describe('findScheduleBundlesForProviders con cupo de plan', () => {
  it('corta por ROW_NUMBER sobre la antigüedad y el cupo del plan', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    await availabilityRepository.findScheduleBundlesForProviders(['prov-1']);

    const sql = (prismaMock.$queryRaw.mock.calls[0]![0] as TemplateStringsArray).join('?');
    expect(sql).toMatch(
      /ROW_NUMBER\(\) OVER \(\s*PARTITION BY p\."providerId" ORDER BY p\."createdAt" ASC, p\.id ASC/,
    );
    expect(sql).toMatch(/pl\."maxProfessionals" IS NULL OR pr\.rank <= pl\."maxProfessionals"/);
  });
});
