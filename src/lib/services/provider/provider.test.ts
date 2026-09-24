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
 *  - la regla P0: guardar una dirección nueva arrastra coordenadas
 *    nuevas, y un payload sin coordenadas no escribe NADA (ni siquiera
 *    el nombre del negocio) en lugar de dejar el estado a medias.
 */

import { ZodError } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repoMock = vi.hoisted(() => ({
  findSettings: vi.fn(),
  updateSettings: vi.fn(),
  findFirstProfessional: vi.fn(),
  updateProfessionalSchedule: vi.fn(),
}));

vi.mock('./provider.repository', () => ({
  providerRepository: repoMock,
}));

import {
  ProviderHasNoProfessionalError,
  ProviderLocationRequiredError,
  ProviderNotFoundError,
} from './provider.errors';
import {
  getProviderSchedule,
  updateProviderSchedule,
  updateProviderSettings,
} from './provider.service';
import type { WeeklySchedule } from '@/lib/services/availability';

const PROVIDER_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';

/** Coordenadas de referencia (centro de Palma) para los payloads válidos. */
const PALMA = { lat: 39.5696, lng: 2.6502 };

beforeEach(() => {
  vi.clearAllMocks();
  // El repositorio devuelve el número de filas actualizadas; por defecto
  // simulamos que el UPDATE encontró su provider.
  repoMock.updateSettings.mockResolvedValue(1);
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
      ...PALMA,
    });

    expect(repoMock.updateSettings).toHaveBeenCalledOnce();
    const args = repoMock.updateSettings.mock.calls[0][1];
    expect(args).toMatchObject({
      businessName: 'Atelier Nuevo',
      vatNumber: 'B12345678',
    });
    // Fusión: la nueva clave `es` sobreescribe, la `ca` original se mantiene.
    expect(args.description).toEqual({ es: 'Nueva descripción', ca: 'Original CA' });
  });

  it('propaga al repositorio las coordenadas nuevas junto a la dirección nueva', async () => {
    repoMock.findSettings.mockResolvedValue({ id: PROVIDER_ID, description: { es: 'x' } });

    // El centro se muda: calle nueva y punto nuevo en la misma llamada.
    await updateProviderSettings(PROVIDER_ID, {
      businessName: 'Atelier Mudado',
      address: 'Carrer Nou 3, Palma',
      lat: 39.5712,
      lng: 2.6488,
    });

    const args = repoMock.updateSettings.mock.calls[0][1];
    expect(args.address).toEqual({
      address: 'Carrer Nou 3, Palma',
      lat: 39.5712,
      lng: 2.6488,
    });
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
      ...PALMA,
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
      ...PALMA,
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
        ...PALMA,
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
        ...PALMA,
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
        ...PALMA,
      }),
    ).rejects.toBeInstanceOf(ProviderNotFoundError);
    expect(repoMock.updateSettings).not.toHaveBeenCalled();
  });

  it('rechaza con ProviderNotFoundError si el UPDATE no afecta a ninguna fila', async () => {
    repoMock.findSettings.mockResolvedValue({ id: PROVIDER_ID, description: {} });
    repoMock.updateSettings.mockResolvedValue(0);

    await expect(
      updateProviderSettings(PROVIDER_ID, {
        businessName: 'Borrado entre llamadas',
        address: 'Carrer Major 12',
        ...PALMA,
      }),
    ).rejects.toBeInstanceOf(ProviderNotFoundError);
  });
});

describe('updateProviderSettings — la dirección no se guarda sin coordenadas', () => {
  it('rechaza con ProviderLocationRequiredError si faltan lat/lng', async () => {
    repoMock.findSettings.mockResolvedValue({ id: PROVIDER_ID, description: { es: 'x' } });

    await expect(
      updateProviderSettings(PROVIDER_ID, {
        businessName: 'Atelier Mudado',
        address: 'Carrer Nou 3, Palma',
      }),
    ).rejects.toBeInstanceOf(ProviderLocationRequiredError);
  });

  it('no escribe NADA cuando el geocoding no resolvió coordenadas', async () => {
    repoMock.findSettings.mockResolvedValue({ id: PROVIDER_ID, description: { es: 'x' } });

    // Escenario real: Mapbox caído, el usuario teclea la calle nueva y
    // le da a guardar. Si el nombre del negocio se guardara y la
    // dirección no, tendríamos justo el estado a medias que queremos
    // eliminar. Se aborta la operación entera antes de tocar BD.
    await expect(
      updateProviderSettings(PROVIDER_ID, {
        businessName: 'Nombre Nuevo',
        description: { es: 'Descripción nueva' },
        address: 'Carrer Nou 3, Palma',
        lat: null,
        lng: null,
      }),
    ).rejects.toBeInstanceOf(ProviderLocationRequiredError);

    expect(repoMock.updateSettings).not.toHaveBeenCalled();
    expect(repoMock.findSettings).not.toHaveBeenCalled();
  });
});

const SAMPLE_SCHEDULE: WeeklySchedule = {
  monday: [{ open: '09:00', close: '14:00' }],
  tuesday: [{ open: '09:00', close: '18:00' }],
  wednesday: [],
  thursday: [
    { open: '10:00', close: '13:00' },
    { open: '16:00', close: '20:00' },
  ],
  friday: [{ open: '09:00', close: '18:00' }],
  saturday: [{ open: '10:00', close: '14:00' }],
  sunday: [],
};

describe('getProviderSchedule', () => {
  it('devuelve el WeeklySchedule del primer Professional', async () => {
    repoMock.findFirstProfessional.mockResolvedValue({
      id: 'prof-1',
      schedule: SAMPLE_SCHEDULE,
    });

    const result = await getProviderSchedule(PROVIDER_ID);

    expect(result).toEqual(SAMPLE_SCHEDULE);
  });

  it('devuelve un schedule vacío si el JSON en BD no encaja con el shape', async () => {
    repoMock.findFirstProfessional.mockResolvedValue({
      id: 'prof-1',
      schedule: { lunes: ['no-format'] }, // shape inválido legacy
    });

    const result = await getProviderSchedule(PROVIDER_ID);

    // Los 7 días vacíos: la UI pinta el editor sin tramos y el usuario
    // lo rellena. No bloqueamos el render por un seed antiguo.
    expect(result.monday).toEqual([]);
    expect(result.sunday).toEqual([]);
  });

  it('lanza ProviderHasNoProfessionalError si no hay Professional', async () => {
    repoMock.findFirstProfessional.mockResolvedValue(null);

    await expect(getProviderSchedule(PROVIDER_ID)).rejects.toBeInstanceOf(
      ProviderHasNoProfessionalError,
    );
  });
});

describe('updateProviderSchedule', () => {
  it('persiste el schedule del primer Professional cuando todo es válido', async () => {
    repoMock.findSettings.mockResolvedValue({ id: PROVIDER_ID, description: { es: '', ca: '' } });
    repoMock.findFirstProfessional.mockResolvedValue({ id: 'prof-1', schedule: {} });
    repoMock.updateProfessionalSchedule.mockResolvedValue(undefined);

    await updateProviderSchedule(PROVIDER_ID, SAMPLE_SCHEDULE);

    expect(repoMock.updateProfessionalSchedule).toHaveBeenCalledWith('prof-1', SAMPLE_SCHEDULE);
  });

  it('rechaza con ZodError si un tramo tiene open >= close', async () => {
    const invalid: WeeklySchedule = {
      ...SAMPLE_SCHEDULE,
      monday: [{ open: '14:00', close: '09:00' }],
    };

    await expect(updateProviderSchedule(PROVIDER_ID, invalid)).rejects.toBeInstanceOf(ZodError);
    expect(repoMock.updateProfessionalSchedule).not.toHaveBeenCalled();
  });

  it('rechaza con ZodError si una hora no tiene formato HH:mm', async () => {
    const invalid: WeeklySchedule = {
      ...SAMPLE_SCHEDULE,
      friday: [{ open: '9:00', close: '18:00' }], // sin cero a la izquierda
    };

    await expect(updateProviderSchedule(PROVIDER_ID, invalid)).rejects.toBeInstanceOf(ZodError);
  });

  it('rechaza con ProviderNotFoundError si el provider no existe', async () => {
    repoMock.findSettings.mockResolvedValue(null);

    await expect(updateProviderSchedule(PROVIDER_ID, SAMPLE_SCHEDULE)).rejects.toBeInstanceOf(
      ProviderNotFoundError,
    );
    expect(repoMock.updateProfessionalSchedule).not.toHaveBeenCalled();
  });

  it('rechaza con ProviderHasNoProfessionalError si no hay Professional', async () => {
    repoMock.findSettings.mockResolvedValue({ id: PROVIDER_ID, description: { es: '', ca: '' } });
    repoMock.findFirstProfessional.mockResolvedValue(null);

    await expect(updateProviderSchedule(PROVIDER_ID, SAMPLE_SCHEDULE)).rejects.toBeInstanceOf(
      ProviderHasNoProfessionalError,
    );
    expect(repoMock.updateProfessionalSchedule).not.toHaveBeenCalled();
  });
});
