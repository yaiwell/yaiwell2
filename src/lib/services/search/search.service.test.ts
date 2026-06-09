/**
 * Tests del servicio search.
 *
 * Mockeamos `search.repository` para validar la capa de servicio en
 * isolación: que parsea/valida correctamente y delega con los args
 * adecuados. Los tests contra Postgres real viven en
 * `scripts/search-smoke.ts`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./search.repository', () => ({
  searchRepository: {
    searchServices: vi.fn(),
    searchProviders: vi.fn(),
  },
}));

import { searchRepository } from './search.repository';
import { SearchValidationError } from './search.errors';
import { searchProviders, searchServices } from './search.service';

const mockRepo = vi.mocked(searchRepository, true);

describe('searchServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delega al repository con defaults (es, limit 20, offset 0)', async () => {
    mockRepo.searchServices.mockResolvedValue([]);

    await searchServices({ query: 'masaje' });

    expect(mockRepo.searchServices).toHaveBeenCalledWith('masaje', 'es', 20, 0);
  });

  it('respeta language, limit y offset cuando se pasan', async () => {
    mockRepo.searchServices.mockResolvedValue([]);

    await searchServices({ query: 'perruqueria', language: 'ca', limit: 5, offset: 10 });

    expect(mockRepo.searchServices).toHaveBeenCalledWith('perruqueria', 'ca', 5, 10);
  });

  it('aplica trim al query antes de enviarlo al repository', async () => {
    mockRepo.searchServices.mockResolvedValue([]);

    await searchServices({ query: '   masaje   ' });

    expect(mockRepo.searchServices).toHaveBeenCalledWith('masaje', 'es', 20, 0);
  });

  it('devuelve tal cual los resultados del repository', async () => {
    const fakeResults = [
      {
        id: 'svc_1',
        providerId: 'prov_1',
        categoryId: 'cat_1',
        professionalId: null,
        name: { es: 'Masaje', ca: 'Massatge' },
        description: { es: 'Relax', ca: 'Relax' },
        priceCents: 4000,
        durationMinutes: 60,
        score: 0.82,
      },
    ];
    mockRepo.searchServices.mockResolvedValue(fakeResults);

    const result = await searchServices({ query: 'masaje' });

    expect(result).toBe(fakeResults);
  });

  it('lanza SearchValidationError si el query está vacío', async () => {
    await expect(searchServices({ query: '   ' })).rejects.toBeInstanceOf(SearchValidationError);
    expect(mockRepo.searchServices).not.toHaveBeenCalled();
  });

  it('lanza SearchValidationError si el query supera 120 chars', async () => {
    const longQuery = 'a'.repeat(121);
    await expect(searchServices({ query: longQuery })).rejects.toBeInstanceOf(
      SearchValidationError,
    );
  });

  it('lanza SearchValidationError si el query contiene caracteres no permitidos', async () => {
    // El símbolo `$` no está en el patrón permitido (letras/dígitos/espacios/
    // guiones/apóstrofes/comas/puntos/comillas).
    await expect(searchServices({ query: 'foo$bar' })).rejects.toBeInstanceOf(
      SearchValidationError,
    );
  });

  it('lanza SearchValidationError si limit supera 50', async () => {
    await expect(searchServices({ query: 'masaje', limit: 51 })).rejects.toBeInstanceOf(
      SearchValidationError,
    );
  });

  it('acepta caracteres unicode catalanes (ç, è, í)', async () => {
    mockRepo.searchServices.mockResolvedValue([]);

    await expect(
      searchServices({ query: 'perruqueria força bé', language: 'ca' }),
    ).resolves.toEqual([]);
  });
});

describe('searchProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delega al repository con defaults', async () => {
    mockRepo.searchProviders.mockResolvedValue([]);

    await searchProviders({ query: 'beauty' });

    expect(mockRepo.searchProviders).toHaveBeenCalledWith('beauty', 'es', 20, 0);
  });

  it('devuelve los resultados del repository', async () => {
    const fakeResults = [
      {
        id: 'prov_1',
        slug: 'salon-zen',
        businessName: 'Salón Zen',
        description: { es: 'Bienestar', ca: 'Benestar' },
        address: 'Carrer Major 1, Barcelona',
        ratingAvg: 4.6,
        ratingCount: 12,
        score: 0.71,
      },
    ];
    mockRepo.searchProviders.mockResolvedValue(fakeResults);

    const result = await searchProviders({ query: 'zen' });

    expect(result).toBe(fakeResults);
  });

  it('lanza SearchValidationError si language no es es/ca', async () => {
    // @ts-expect-error — queremos comprobar que Zod rechaza en runtime.
    await expect(searchProviders({ query: 'zen', language: 'fr' })).rejects.toBeInstanceOf(
      SearchValidationError,
    );
  });
});
