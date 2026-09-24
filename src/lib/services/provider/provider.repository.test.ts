/**
 * Tests del repositorio `provider`.
 *
 * Mockeamos el cliente Prisma para inspeccionar el SQL crudo. Es la
 * única forma de verificar sin BD que el update toca de verdad la
 * columna PostGIS `location` — el P0 era justamente que no la tocaba,
 * y ningún test de service lo habría detectado porque el repositorio
 * estaba mockeado.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureSpanish } from '@/lib/i18n';

const prismaMock = vi.hoisted(() => ({
  $executeRawUnsafe: vi.fn(),
  $queryRawUnsafe: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));

import { parseGeolocatedAddress } from './provider.address';
import { providerRepository } from './provider.repository';

const PROVIDER_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('providerRepository.updateSettings', () => {
  it('escribe la columna PostGIS location con las coordenadas nuevas', async () => {
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);

    await providerRepository.updateSettings(PROVIDER_ID, {
      businessName: 'Atelier Mudado',
      vatNumber: 'B12345678',
      description: ensureSpanish({ es: 'Nos hemos mudado' }),
      address: parseGeolocatedAddress({
        address: 'Carrer Nou 3, Palma',
        lat: 39.5696,
        lng: 2.6502,
      }),
    });

    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledOnce();
    const [sql, ...params] = prismaMock.$executeRawUnsafe.mock.calls[0];

    // La misma sentencia actualiza texto y punto: no hay ventana en la
    // que la calle sea nueva y las coordenadas viejas.
    expect(sql).toContain('UPDATE providers');
    expect(sql).toContain('address = $5');
    expect(sql).toContain('ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography');
    expect(sql).toContain('"deletedAt" IS NULL');
    // `id` es una columna `text` (Prisma genera el uuid en aplicación):
    // castearla a ::uuid reventaría la query.
    expect(sql).not.toContain('::uuid');

    expect(params[0]).toBe(PROVIDER_ID);
    expect(params[4]).toBe('Carrer Nou 3, Palma');
    // PostGIS espera ST_MakePoint(lng, lat) — el orden importa y
    // invertirlo dejaría a los centros de Palma en Somalia.
    expect(params[5]).toBe(2.6502);
    expect(params[6]).toBe(39.5696);
  });

  it('devuelve el número de filas actualizadas', async () => {
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);

    const updated = await providerRepository.updateSettings(PROVIDER_ID, {
      businessName: 'Borrado entre llamadas',
      vatNumber: null,
      description: ensureSpanish({ es: 'sin cambios' }),
      address: parseGeolocatedAddress({ address: 'Calle Real 1', lat: 40, lng: -3 }),
    });

    expect(updated).toBe(0);
  });
});

describe('providerRepository.findAddress', () => {
  it('desempaqueta el punto PostGIS en lat/lng', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { address: 'Carrer Major 12, Palma', lat: 39.5696, lng: 2.6502 },
    ]);

    const row = await providerRepository.findAddress(PROVIDER_ID);

    const [sql] = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('ST_Y(p.location::geometry)');
    expect(sql).toContain('ST_X(p.location::geometry)');
    expect(row).toEqual({ address: 'Carrer Major 12, Palma', lat: 39.5696, lng: 2.6502 });
  });

  it('devuelve null si el provider no existe o está soft-deleted', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);

    expect(await providerRepository.findAddress(PROVIDER_ID)).toBeNull();
  });
});
