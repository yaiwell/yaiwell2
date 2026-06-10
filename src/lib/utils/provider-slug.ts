import type { Provider } from '@/types/domain';

/**
 * Expresión regular que captura el id `prov-NN` al final del segmento.
 * El slug del proveedor puede contener guiones (`atelier-norte`), por lo
 * que anclamos al final con `$` para que el id sea siempre el sufijo.
 */
const PROVIDER_ID_SUFFIX_REGEX = /-(prov-\d+)$/;

/**
 * Construye el segmento de URL `{slug}-{id}` para la ficha del proveedor.
 *
 * Mantenemos el id en la URL porque el slug puede cambiar en el futuro
 * (rebranding, corrección tipográfica) sin romper enlaces compartidos.
 *
 * @param provider — proveedor con `slug` e `id`.
 * @returns segmento listo para concatenar a la ruta, p. ej. `atelier-norte-prov-01`.
 */
export function buildProviderSlugWithId(provider: Pick<Provider, 'slug' | 'id'>): string {
  return `${provider.slug}-${provider.id}`;
}

/**
 * Parsea un segmento `{slug}-{id}` y devuelve el id `prov-NN` final.
 *
 * Validamos la forma estricta del id (`prov-` seguido de uno o más
 * dígitos) para que rutas con formato inesperado devuelvan `null` y
 * la página pueda responder con 404 sin tocar BD.
 *
 * @param slugWithId — segmento tal cual viene de la URL.
 * @returns el id del proveedor o `null` si no encaja el formato.
 */
export function parseProviderIdFromSlugWithId(slugWithId: string): string | null {
  const match = slugWithId.match(PROVIDER_ID_SUFFIX_REGEX);
  return match ? match[1] : null;
}

/**
 * Normaliza un texto en bruto a un slug URL-safe.
 *
 * Reglas:
 *  - Quita acentos y diacríticos vía NFD + strip de combining marks
 *    (resuelve ç → c, ñ → n, ü → u, è → e). Hecho a mano para no
 *    arrastrar dependencias (`slugify` npm trae locale data inútil).
 *  - Pasa a minúsculas.
 *  - Sustituye todo lo que no sea alfanumérico por guion (incluye
 *    espacios, emojis, símbolos y apóstrofos).
 *  - Colapsa guiones repetidos y recorta los de los extremos.
 *
 * Pensado para alimentar el campo `slug` del wizard de onboarding
 * (#57). El servidor sigue validando con regex estricto y la BD con
 * el UNIQUE constraint, este helper solo da un punto de partida
 * sensato al usuario.
 *
 * @param raw — texto libre (típicamente `businessName`).
 * @returns slug normalizado, posiblemente vacío si el input no tiene
 *   ningún carácter alfanumérico.
 */
export function slugifyBusinessName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
