/**
 * Filtro temporal de `/buscar` (`?when=`).
 *
 * Vive en `lib/utils`, sin Prisma ni `server-only`, porque lo usan la URL,
 * el sheet de filtros y el Hero, que son de cliente, y el motor de
 * disponibilidad, en servidor.
 */

/** Rangos de días que entiende el buscador. */
export const SEARCH_WHEN_OPTIONS = ['today', 'tomorrow', 'this-week'] as const;

export type SearchWhen = (typeof SEARCH_WHEN_OPTIONS)[number];

/**
 * Valida un valor de la URL. Un valor desconocido no filtra: una URL mal
 * copiada debe seguir abriendo algo.
 *
 * @param value — valor crudo de `?when=`.
 */
export function parseSearchWhen(value: unknown): SearchWhen | null {
  return SEARCH_WHEN_OPTIONS.includes(value as SearchWhen) ? (value as SearchWhen) : null;
}
