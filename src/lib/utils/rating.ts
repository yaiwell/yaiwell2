import type { AppLocale } from '@/i18n/routing';
import { toIntlLocale } from '@/lib/i18n';

/**
 * Regla única de cómo se enseña la nota de un proveedor.
 *
 * Vive en `lib/utils` porque la usan Server Components (cabecera y
 * sección de reseñas de la ficha), Client Components (card, popup del
 * mapa, panel del proveedor) y el filtro de búsqueda. Sin Prisma ni
 * `server-only`: es seguro para el bundle de cliente.
 */

/** Qué hay que pintar, ya decidido. */
export type RatingDisplay = { kind: 'new' } | { kind: 'rated'; value: number; count: number };

/**
 * Decide si un proveedor se pinta con su nota o como «Nuevo en Yaiwell».
 *
 * Sin reseñas no hay nota: «0.0 · 0 valoraciones» se lee como un centro
 * malo, no como uno recién llegado. Tampoco hay cifra si la caché llega
 * incoherente (reseñas pero media fuera de 1-5, o valores no finitos):
 * mejor no enseñar nada que una nota que contradiga a las reseñas.
 *
 * @param ratingAvg — media cacheada en `providers.ratingAvg`.
 * @param reviewsCount — reseñas cacheadas en `providers.ratingCount`.
 * @returns `{ kind: 'new' }` o la media (acotada a 5) con su contador.
 */
export function getRatingDisplay(ratingAvg: number, reviewsCount: number): RatingDisplay {
  if (!Number.isFinite(reviewsCount) || reviewsCount < 1) return { kind: 'new' };
  if (!Number.isFinite(ratingAvg) || ratingAvg < 1) return { kind: 'new' };

  // Una reseña vale como mucho 5★: por encima es ruido o dato corrupto.
  return { kind: 'rated', value: Math.min(ratingAvg, 5), count: Math.floor(reviewsCount) };
}

/**
 * Indica si el proveedor tiene una nota que se pueda enseñar o filtrar.
 * Es la misma condición que `getRatingDisplay` usa para no decir «nuevo».
 */
export function hasPublicRating(ratingAvg: number, reviewsCount: number): boolean {
  return getRatingDisplay(ratingAvg, reviewsCount).kind === 'rated';
}

/**
 * Media de un conjunto de notas redondeada a 1 decimal con el mismo
 * criterio que el trigger SQL (`ROUND(AVG(rating)::numeric, 1)`, mitad
 * hacia arriba): 4.25 → 4.3.
 *
 * Calculamos `round(total * 10 / n)` en lugar de `round(avg * 10)`:
 * `total * 10` es entero, así que un empate x.5 es exacto en binario y
 * `Math.round` lo sube igual que Postgres.
 *
 * @param ratings — notas de 1 a 5.
 * @returns la media con 1 decimal, o 0 si no hay notas.
 */
export function roundRatingAverage(ratings: readonly number[]): number {
  if (ratings.length === 0) return 0;
  const total = ratings.reduce((sum, r) => sum + r, 0);
  return Math.round((total * 10) / ratings.length) / 10;
}

// Un formateador por locale: crearlos tiene coste y la lista es fija.
const formatters = new Map<AppLocale, Intl.NumberFormat>();

/**
 * Formatea una nota con exactamente 1 decimal según el idioma:
 * «4,8» en `es`/`ca`/`de`, «4.8» en `en`.
 *
 * @param value — nota ya redondeada/acotada.
 * @param locale — locale activo de la app.
 */
export function formatRatingValue(value: number, locale: AppLocale): string {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(toIntlLocale(locale), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    formatters.set(locale, formatter);
  }
  return formatter.format(value);
}
