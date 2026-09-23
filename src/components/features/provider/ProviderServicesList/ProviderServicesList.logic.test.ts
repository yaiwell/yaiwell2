import { describe, expect, it } from 'vitest';

import type { ServiceWithRootCategory } from '@/types/domain';

import { groupServicesByRootCategory } from './ProviderServicesList.logic';

/**
 * Test de regresión de la agrupación del catálogo de la ficha.
 *
 * Los `categoryId` tienen forma de **UUID real** a propósito: esa es la
 * forma que tienen en BD. Cuando la agrupación resolvía la jerarquía
 * contra `fake-data` (ids `cat-beauty`…) el lookup fallaba siempre y
 * todos los servicios acababan en el grupo de fallback "Otros". Si
 * alguien vuelve a resolver contra ids del fake-data, estos tests caen.
 */

const BEAUTY_ROOT = {
  id: '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c',
  slug: 'belleza',
  name: { es: 'Belleza', ca: 'Bellesa' },
};

const WELLNESS_ROOT = {
  id: '5e4d3c2b-1a09-4877-9665-4433221100ff',
  slug: 'bienestar',
  name: { es: 'Bienestar', ca: 'Benestar' },
};

/** Construye un servicio con `categoryId` UUID y su raíz ya resuelta. */
function makeService(
  id: string,
  categoryId: string,
  rootCategory: ServiceWithRootCategory['rootCategory'],
): ServiceWithRootCategory {
  return {
    id,
    providerId: 'a0b1c2d3-e4f5-4061-8273-8495a6b7c8d9',
    professionalId: null,
    categoryId,
    name: { es: `Servicio ${id}`, ca: `Servei ${id}` },
    description: { es: 'Descripción', ca: 'Descripció' },
    durationMinutes: 45,
    priceCents: 3500,
    rootCategory,
  };
}

const HAIRCUT = makeService(
  'c9d8e7f6-a5b4-4332-9110-ffeeddccbbaa',
  'd1c2b3a4-e5f6-4708-9a1b-2c3d4e5f6071',
  BEAUTY_ROOT,
);
const MANICURE = makeService(
  '11223344-5566-4778-899a-abbccddeeff0',
  '99887766-5544-4332-9110-aabbccddeeff',
  BEAUTY_ROOT,
);
const MASSAGE = makeService(
  '0f1e2d3c-4b5a-4968-b776-8594a3b2c1d0',
  '778899aa-bbcc-4dde-9ff0-112233445566',
  WELLNESS_ROOT,
);

describe('groupServicesByRootCategory', () => {
  it('agrupa por categoría raíz real y NO cae en el fallback con categoryIds UUID', () => {
    const groups = groupServicesByRootCategory([HAIRCUT, MASSAGE, MANICURE]);

    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.rootCategory?.slug)).toEqual(['belleza', 'bienestar']);
    // Ningún grupo sin raíz: el fallback "Otros" debe ser la excepción.
    expect(groups.every((g) => g.rootCategory !== null)).toBe(true);
  });

  it('conserva el orden de aparición de raíces y de servicios dentro del grupo', () => {
    const groups = groupServicesByRootCategory([HAIRCUT, MASSAGE, MANICURE]);

    expect(groups[0].services.map((s) => s.id)).toEqual([HAIRCUT.id, MANICURE.id]);
    expect(groups[1].services.map((s) => s.id)).toEqual([MASSAGE.id]);
  });

  it('manda al grupo sin raíz solo los servicios con categoría huérfana', () => {
    const orphan = makeService(
      'aabbccdd-eeff-4011-9223-344556677889',
      'fedcba98-7654-4321-8fed-cba987654321',
      null,
    );

    const groups = groupServicesByRootCategory([HAIRCUT, orphan]);

    expect(groups).toHaveLength(2);
    expect(groups[0].rootCategory?.slug).toBe('belleza');
    expect(groups[1].rootCategory).toBeNull();
    expect(groups[1].services).toEqual([orphan]);
  });

  it('devuelve lista vacía sin servicios', () => {
    expect(groupServicesByRootCategory([])).toEqual([]);
  });
});
