/**
 * Utilidades compartidas del módulo `suggestions`.
 *
 * Aislamos aquí la normalización de texto y el cálculo de `matchRange`
 * para que tanto el servicio como sus tests puedan reutilizarlas sin
 * duplicar la heurística.
 *
 * La normalización (lower + NFD + strip de diacríticos) replica el
 * comportamiento que Postgres ofrece con `unaccent + lower`. Lo
 * mantenemos en JS porque el cálculo del rango de coincidencia
 * dentro del label se hace una vez por sugerencia ya en memoria,
 * tras la consulta SQL.
 */

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/**
 * Normaliza una cadena: minúsculas + descomposición Unicode + sin
 * diacríticos. Es la versión "barata" de `unaccent + lower` de Postgres.
 *
 * El rango Unicode U+0300..U+036F cubre todas las marcas diacríticas
 * combinables que NFD genera (tildes, acentos agudos/graves, virgulilla).
 */
export function normalizeForMatch(input: string): string {
  return input.toLowerCase().normalize('NFD').replace(COMBINING_DIACRITICS, '');
}

/**
 * Devuelve el rango `[inicio, fin)` de la primera ocurrencia de
 * `normalizedQuery` dentro de `label`, referido a la cadena original.
 *
 * Los offsets son válidos en `label` porque NFD descompone caracteres
 * pero no elimina ninguno (las marcas diacríticas pasan a un code point
 * extra que `replace` quita; las posiciones de las letras base se
 * mantienen 1:1).
 *
 * Devuelve `null` si no hay match o si `normalizedQuery` está vacío
 * (caso degenerado: matchRange `[0, 0]` confundiría al render).
 */
export function findMatchRange(label: string, normalizedQuery: string): [number, number] | null {
  if (normalizedQuery.length === 0) return null;
  const normalized = normalizeForMatch(label);
  const idx = normalized.indexOf(normalizedQuery);
  if (idx === -1) return null;
  return [idx, idx + normalizedQuery.length];
}
