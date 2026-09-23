import { describe, expect, it } from 'vitest';

import { resolveRootCategory, type CategoryChainNode } from './providers.categories';

/**
 * Test de regresión de la resolución de categoría raíz.
 *
 * Contexto: hasta 2026-09 la ficha de centro resolvía la raíz contra el
 * catálogo de `fake-data` (ids `cat-beauty`, `cat-hair`…). En BD los ids
 * son UUIDs generados en el seed, así que el lookup fallaba SIEMPRE y
 * todo el catálogo caía bajo el epígrafe de fallback "Otros".
 *
 * Por eso todos los ids de estos tests tienen forma de UUID real: si
 * alguien vuelve a resolver contra ids del fake-data, aquí se ve.
 */

const ROOT_ID = '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c';
const TYPE_ID = '7c6b5a49-3827-4615-9403-2f1e0d9c8b7a';
const LEAF_ID = 'd1c2b3a4-e5f6-4708-9a1b-2c3d4e5f6071';

/** Cadena de 3 niveles: Belleza → Peluquería → Corte. */
const leafWithFullChain: CategoryChainNode = {
  id: LEAF_ID,
  slug: 'corte',
  name: { es: 'Corte', ca: 'Tall' },
  parentId: TYPE_ID,
  parent: {
    id: TYPE_ID,
    slug: 'peluqueria',
    name: { es: 'Peluquería', ca: 'Perruqueria' },
    parentId: ROOT_ID,
    parent: {
      id: ROOT_ID,
      slug: 'belleza',
      name: { es: 'Belleza', ca: 'Bellesa' },
      parentId: null,
    },
  },
};

describe('resolveRootCategory', () => {
  it('sube 2 niveles hasta la raíz con ids con forma de UUID', () => {
    const root = resolveRootCategory(leafWithFullChain);

    expect(root).not.toBeNull();
    expect(root?.id).toBe(ROOT_ID);
    expect(root?.slug).toBe('belleza');
    expect(root?.name.es).toBe('Belleza');
  });

  it('devuelve la propia categoría cuando ya es raíz', () => {
    const root = resolveRootCategory({
      id: ROOT_ID,
      slug: 'deporte',
      name: { es: 'Deporte', ca: 'Esport' },
      parentId: null,
    });

    expect(root?.id).toBe(ROOT_ID);
    expect(root?.slug).toBe('deporte');
  });

  it('normaliza el name JSONB parcial (solo es/ca) sin romper', () => {
    const root = resolveRootCategory({
      id: ROOT_ID,
      slug: 'bienestar',
      name: { es: 'Bienestar', ca: 'Benestar' },
      parentId: null,
    });

    expect(root?.name).toEqual({ es: 'Bienestar', ca: 'Benestar', en: undefined, de: undefined });
  });

  it('devuelve null si la cadena de ancestros está rota (categoría huérfana)', () => {
    // `parentId` apunta a un padre que el select no trajo: no podemos
    // afirmar cuál es la raíz, así que el caller usará el fallback.
    const orphan = resolveRootCategory({
      id: LEAF_ID,
      slug: 'corte',
      name: { es: 'Corte', ca: 'Tall' },
      parentId: TYPE_ID,
      parent: null,
    });

    expect(orphan).toBeNull();
  });

  it('devuelve null si no hay categoría', () => {
    expect(resolveRootCategory(null)).toBeNull();
    expect(resolveRootCategory(undefined)).toBeNull();
  });
});
