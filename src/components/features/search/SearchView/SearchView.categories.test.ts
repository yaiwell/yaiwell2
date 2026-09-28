import { describe, expect, it } from 'vitest';

import type { CategoryTreeRoot } from './SearchView.categories';
import { buildSearchCategories } from './SearchView.categories';

/**
 * Tests de la conversión del árbol de categorías de BD a datos del
 * buscador. Sustituye a la lectura de `fake-data`, que dejaba fuera
 * cualquier categoría creada en la BD.
 */
const tree: CategoryTreeRoot[] = [
  {
    id: 'r-est',
    slug: 'estetica',
    name: { es: 'Estética', ca: 'Estètica' },
    types: [],
  },
  {
    id: 'r-bel',
    slug: 'belleza',
    name: { es: 'Belleza', ca: 'Bellesa', en: 'Beauty' },
    types: [
      {
        id: 't-man',
        slug: 'manicura-pedicura',
        name: { es: 'Manicura y pedicura', ca: 'Manicura i pedicura' },
        subtypes: [
          { id: 's-gel', slug: 'unas-gel', name: { es: 'Uñas de gel', ca: 'Ungles de gel' } },
        ],
      },
    ],
  },
  {
    // Categoría que solo existe en BD: nunca estuvo en fake-data.
    id: 'r-new',
    slug: 'mascotas',
    name: { es: 'Mascotas', ca: 'Mascotes' },
    types: [],
  },
];

describe('buildSearchCategories', () => {
  it('incluye las raíces de la BD, localizadas y ordenadas por nombre visible', () => {
    const { roots } = buildSearchCategories(tree, 'es', null);

    expect(roots.map((r) => r.label)).toEqual(['Belleza', 'Estética', 'Mascotas']);
    expect(roots.find((r) => r.slug === 'mascotas')).toEqual({
      id: 'r-new',
      slug: 'mascotas',
      label: 'Mascotas',
    });
  });

  it('cae al castellano cuando falta la traducción del locale', () => {
    const { roots } = buildSearchCategories(tree, 'de', null);
    expect(roots.map((r) => r.label)).toContain('Mascotas');
  });

  it('resuelve la etiqueta activa aunque sea una subcategoría', () => {
    expect(buildSearchCategories(tree, 'ca', 'manicura-pedicura').activeLabel).toBe(
      'Manicura i pedicura',
    );
    expect(buildSearchCategories(tree, 'es', 'unas-gel').activeLabel).toBe('Uñas de gel');
    expect(buildSearchCategories(tree, 'en', 'belleza').activeLabel).toBe('Beauty');
  });

  it('devuelve activeLabel null sin filtro o con un slug que no existe', () => {
    expect(buildSearchCategories(tree, 'es', null).activeLabel).toBeNull();
    expect(buildSearchCategories(tree, 'es', 'no-existe').activeLabel).toBeNull();
  });
});
