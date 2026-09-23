import type { HeroCategorySlug } from './Hero/Hero.types';

/**
 * Claves i18n disponibles dentro del namespace `home.categories`.
 *
 * Se mantienen cortas y estables aunque el slug de BD sea más largo
 * (ej. `manicura-pedicura` → clave `manicura`), para no tener que tocar
 * los cuatro ficheros de mensajes cada vez que se renombra una
 * categoría en base de datos.
 */
export type LandingCategoryLabelKey =
  | 'peluqueria'
  | 'masajes'
  | 'manicura'
  | 'gimnasio'
  | 'estetica'
  | 'yoga';

/**
 * Categorías destacadas en la landing, en el orden en que se muestran.
 *
 * Es la **única** fuente de verdad compartida por el Hero (dropdown
 * "¿Qué?") y por `CategoryGrid`. Cada slug viaja tal cual a
 * `/buscar?cat=<slug>` y `providers.search.ts` lo resuelve contra
 * `prisma.category.slug`: si aquí hubiera un slug inexistente, la
 * búsqueda no encontraría la categoría y devolvería cero resultados en
 * silencio. `categories.test.ts` cruza esta lista contra el catálogo
 * real para que eso no vuelva a pasar.
 */
export const landingCategorySlugs: readonly HeroCategorySlug[] = [
  'peluqueria',
  'masajes',
  'manicura-pedicura',
  'gimnasio',
  'estetica',
  'yoga',
] as const;

/**
 * Traduce cada slug de categoría a su clave dentro de `home.categories`.
 *
 * Desacoplar slug y clave i18n es lo que permite corregir el slug en BD
 * sin renombrar claves en `es/ca/en/de.json`.
 */
export const landingCategoryLabelKey: Record<HeroCategorySlug, LandingCategoryLabelKey> = {
  peluqueria: 'peluqueria',
  masajes: 'masajes',
  'manicura-pedicura': 'manicura',
  gimnasio: 'gimnasio',
  estetica: 'estetica',
  yoga: 'yoga',
};
