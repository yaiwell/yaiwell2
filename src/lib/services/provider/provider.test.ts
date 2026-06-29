/**
 * Tests del servicio `provider` (operaciones de panel).
 *
 * Mockeamos `providerRepository` con `vi.hoisted` para que el mock esté
 * disponible antes de que el service lo importe. Así los tests ejercen
 * la lógica de negocio (validación + fusión de LocalizedText) sin tocar
 * Prisma ni BD.
 *
 * Cubrimos:
 *  - updateProviderSettings: happy path, validación falla (businessName
 *    corto y address vacío), provider no encontrado, fusión defensiva
 *    de description con claves preexistentes.
 */

import { ZodError } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repoMock = vi.hoisted(() => ({
  findSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('./provider.repository', () => ({
  providerRepository: repoMock,
}));

import { ProviderNotFoundError } from './provider.errors';
import { updateProviderSettings } from './provider.service';

const PROVIDER_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('updateProviderSettings', () => {
  it('persiste los campos editables cuando el input es válido', async () => {
    repoMock.findSettings.mockResolvedValue({
      id: PROVIDER_ID,
      description: { es: 'Original ES', ca: 'Original CA' },
    });

    await updateProviderSettings(PROVIDER_ID, {
      businessName: 'Atelier Nuevo',
      vatNumber: 'B12345678',
      description: { es: 'Nueva descripción' },
      address: 'Carrer Major 12, Palma',
    });

    expect(repoMock.updateSettings).toHaveBeenCalledOnce();
    const args = repoMock.updateSettings.mock.calls[0][1];
    expect(args).toMatchObject({
      businessName: 'Atelier Nuevo',
      vatNumber: 'B12345678',
      address: 'Carrer Major 12, Palma',
    });
    // Fusión: la nueva clave `es` sobreescribe, la `ca` original se mantiene.
    expect(args.description).toEqual({ es: 'Nueva descripción', ca: 'Original CA' });
  });

  it('normaliza vatNumber vacío a null', async () => {
    repoMock.findSettings.mockResolvedValue({
      id: PROVIDER_ID,
      description: { es: 'x', ca: 'x' },
    });

    await updateProviderSettings(PROVIDER_ID, {
      businessName: 'Sin NIF',
      vatNumber: '',
      address: 'Calle Real 1',
    });

    const args = repoMock.updateSettings.mock.calls[0][1];
    expect(args.vatNumber).toBeNull();
  });

  it('conserva la descripción existente si el input no trae description', async () => {
    repoMock.findSettings.mockResolvedValue({
      id: PROVIDER_ID,
      description: { es: 'Mantenida', ca: 'Mantinguda', de: 'Beibehalten' },
    });

    await updateProviderSettings(PROVIDER_ID, {
      businessName: 'Sin cambios de copy',
      address: 'Calle Real 1',
    });

    const args = repoMock.updateSettings.mock.calls[0][1];
    expect(args.description).toEqual({
      es: 'Mantenida',
      ca: 'Mantinguda',
      de: 'Beibehalten',
    });
  });

  it('rechaza con ZodError si businessName es demasiado corto', async () => {
    await expect(
      updateProviderSettings(PROVIDER_ID, {
        businessName: 'A',
        address: 'Calle Real 1',
      }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(repoMock.findSettings).not.toHaveBeenCalled();
    expect(repoMock.updateSettings).not.toHaveBeenCalled();
  });

  it('rechaza con ZodError si address está vacío', async () => {
    await expect(
      updateProviderSettings(PROVIDER_ID, {
        businessName: 'Nombre OK',
        address: '',
      }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(repoMock.updateSettings).not.toHaveBeenCalled();
  });

  it('rechaza con ProviderNotFoundError si el provider no existe', async () => {
    repoMock.findSettings.mockResolvedValue(null);

    await expect(
      updateProviderSettings(PROVIDER_ID, {
        businessName: 'Nombre OK',
        address: 'Carrer Major 12',
      }),
    ).rejects.toBeInstanceOf(ProviderNotFoundError);
    expect(repoMock.updateSettings).not.toHaveBeenCalled();
  });
});
