import { describe, expect, it } from 'vitest';

import { fakeCategories } from '@/lib/fake-data/categories';
import esMessages from '@/messages/es.json';

import { categoryItems } from './CategoryGrid/CategoryGrid.data';
import { landingCategoryLabelKey, landingCategorySlugs } from './categories';

/**
 * Test de regresión de los slugs de categoría de la landing.
 *
 * Motivación: el Hero y `CategoryGrid` enlazan a `/buscar?cat=<slug>` y
 * `providers.search.ts` resuelve ese slug contra `prisma.category`. Si el
 * slug no existe, `resolvedCategoryId` queda `null`, el filtro descarta
 * **todos** los proveedores y la tarjeta lleva a una página vacía sin
 * ningún error visible. Pasó con `manicura` (el slug real es
 * `manicura-pedicura`) y sólo se detectó mirando la pantalla.
 *
 * `fakeCategories` es la fuente que siembra la tabla `Category`
 * (`prisma/seed.ts` hace `upsert` por `slug`), así que cruzar contra ella
 * equivale a cruzar contra BD sin necesitar conexión.
 */

const seededSlugs = new Set(fakeCategories.map((category) => category.slug));

describe('slugs de categoría de la landing', () => {
  it.each(landingCategorySlugs)(
    'el slug "%s" del dropdown del Hero existe en el catálogo sembrado',
    (slug) => {
      expect(seededSlugs).toContain(slug);
    },
  );

  it.each(categoryItems.map((item) => item.slug))(
    'el slug "%s" de la tarjeta de CategoryGrid existe en el catálogo sembrado',
    (slug) => {
      expect(seededSlugs).toContain(slug);
    },
  );

  it('Hero y CategoryGrid ofrecen exactamente las mismas categorías', () => {
    expect(categoryItems.map((item) => item.slug)).toEqual([...landingCategorySlugs]);
  });

  it('cada slug tiene clave i18n declarada y traducida en es.json', () => {
    for (const slug of landingCategorySlugs) {
      const key = landingCategoryLabelKey[slug];
      expect(key, `falta la clave i18n del slug "${slug}"`).toBeDefined();
      expect(
        esMessages.home.categories,
        `home.categories.${key} no existe en es.json`,
      ).toHaveProperty(key);
    }
  });
});
