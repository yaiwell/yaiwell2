/**
 * Tests del matching de texto libre del buscador.
 *
 * Son funciones puras: aquí se fija el contrato (sin tildes, AND entre
 * términos, servicios y categorías cuentan) sin depender de la BD.
 */

import { describe, expect, it } from 'vitest';

import type { Provider } from '@/types/domain';

import {
  buildProviderHaystack,
  matchesAllTokens,
  normalizeSearchText,
  tokenizeSearchQuery,
} from './providers.text-match';

const baseProvider: Provider = {
  id: 'prov-a',
  slug: 'born-padel-club',
  name: 'Born Pàdel Club',
  type: 'centro',
  description: { es: 'Pistas cubiertas en el centro.', ca: 'Pistes cobertes al centre.' },
  address: 'Carrer del Born 1, Palma',
  location: { lat: 39.57, lng: 2.65 },
  photos: [],
  rating: 4.8,
  reviewsCount: 10,
  priceRange: '€€',
  categoryIds: [],
};

/** Atajo: ¿encuentra la consulta a este proveedor con este texto extra? */
function matches(query: string, provider: Provider, searchText = ''): boolean {
  return matchesAllTokens(buildProviderHaystack(provider, searchText), tokenizeSearchQuery(query));
}

describe('normalizeSearchText', () => {
  it('quita tildes, graves y diéresis y pasa a minúsculas', () => {
    expect(normalizeSearchText('Pàdel PÁDEL Pingüino Peluquería')).toBe(
      'padel padel pinguino peluqueria',
    );
  });

  it('conserva la ñ como n para que "unas" encuentre "uñas"', () => {
    expect(normalizeSearchText('Uñas')).toBe('unas');
  });
});

describe('tokenizeSearchQuery', () => {
  it('parte por espacios y descarta vacíos', () => {
    expect(tokenizeSearchQuery('  Masaje   Relajante ')).toEqual(['masaje', 'relajante']);
  });

  it('una consulta en blanco no produce términos', () => {
    expect(tokenizeSearchQuery('   ')).toEqual([]);
  });
});

describe('matching de proveedores', () => {
  it('"padel" sin tilde encuentra "Born Pàdel Club"', () => {
    expect(matches('padel', baseProvider)).toBe(true);
  });

  it('encuentra por nombre de servicio aunque no esté en la descripción', () => {
    const provider = { ...baseProvider, name: 'Atelier Norte', slug: 'atelier-norte' };
    expect(matches('corte', provider)).toBe(false);
    expect(matches('corte', provider, 'Corte mujer Tall dona')).toBe(true);
  });

  it('encuentra por nombre de categoría ancestra', () => {
    // El repositorio añade la ascendencia completa: "Belleza" es la raíz
    // de "Uñas", que a su vez es la de "Manicura semipermanente".
    const provider = { ...baseProvider, name: 'Estudi Ungla' };
    expect(matches('belleza', provider, 'Manicura semipermanente Uñas Belleza')).toBe(true);
  });

  it('exige todos los términos (AND), en cualquier campo y orden', () => {
    const provider = {
      ...baseProvider,
      name: 'Casa Mar',
      description: { es: 'Ambiente relajante junto al mar.', ca: 'Ambient relaxant.' },
    };
    expect(matches('masaje relajante', provider, 'Masaje deportivo')).toBe(true);
    expect(matches('relajante masaje', provider, 'Masaje deportivo')).toBe(true);
    expect(matches('masaje facial', provider, 'Masaje deportivo')).toBe(false);
  });

  it('busca también en las descripciones en inglés y alemán', () => {
    const provider = {
      ...baseProvider,
      description: { ...baseProvider.description, en: 'Indoor courts', de: 'Hallenplätze' },
    };
    expect(matches('indoor', provider)).toBe(true);
    expect(matches('hallenplatze', provider)).toBe(true);
  });

  it('no encuentra lo que no aparece en ningún campo', () => {
    expect(matches('manicura', baseProvider, 'Hora de pista cubierta Pádel Deporte')).toBe(false);
  });

  it('sin términos no filtra nada', () => {
    expect(matchesAllTokens('cualquier cosa', [])).toBe(true);
  });
});
