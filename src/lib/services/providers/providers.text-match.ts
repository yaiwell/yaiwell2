import type { Provider } from '@/types/domain';

/**
 * Matching de texto libre del buscador `/buscar`.
 *
 * Funciones puras, sin BD, para poder testearlas sin mocks. Es el
 * placeholder hasta conectar el FTS de Postgres (`tsvector` + `pg_trgm`)
 * cuando el catálogo crezca y filtrar en Node deje de escalar.
 */

/**
 * Normaliza texto para comparar: minúsculas y sin diacríticos.
 *
 * La gente escribe sin tildes desde el móvil: "padel" tiene que
 * encontrar "Born Pàdel Club". NFD separa la letra base de su acento y
 * `\p{Diacritic}` se lleva los acentos (también la diéresis y el grave
 * del catalán). `toLowerCase` va primero porque algunas mayúsculas se
 * descomponen distinto que sus minúsculas.
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Parte la consulta en términos normalizados, descartando vacíos.
 * Una consulta de solo espacios devuelve `[]` (= sin filtro de texto).
 */
export function tokenizeSearchQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Construye el texto normalizado sobre el que se busca un proveedor:
 * nombre, dirección, descripción en los idiomas que tenga y el texto
 * extra de servicios y categorías que calcula el repositorio.
 */
export function buildProviderHaystack(provider: Provider, searchText: string): string {
  const { es, ca, en, de } = provider.description;
  return normalizeSearchText(
    [provider.name, provider.address, es, ca, en ?? '', de ?? '', searchText].join(' '),
  );
}

/**
 * `true` si **todos** los términos aparecen en el haystack (AND).
 *
 * AND y no frase exacta: "masaje relajante" debe encontrar "Masaje
 * relajante 60 min" pero también a quien tiene "masaje" en un servicio y
 * "relajante" en la descripción. AND y no OR: con OR, añadir palabras
 * ampliaría resultados, justo lo contrario de lo que espera quien afina.
 *
 * @param haystack — texto ya normalizado (ver `buildProviderHaystack`).
 * @param tokens — términos ya normalizados (ver `tokenizeSearchQuery`).
 */
export function matchesAllTokens(haystack: string, tokens: readonly string[]): boolean {
  return tokens.every((token) => haystack.includes(token));
}
