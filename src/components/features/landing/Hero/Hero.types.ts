/**
 * Tipos del componente Hero de la landing.
 *
 * Los slugs de categoría deben coincidir **literalmente** con los de la
 * tabla `Category` (sembrada desde `@/lib/fake-data/categories`), porque
 * viajan a `/buscar?cat=` y allí se resuelven contra BD. La unión
 * literal sólo protege de typos dentro del repo; la correspondencia con
 * el catálogo real la verifica `landing/categories.test.ts`.
 */
export type HeroCategorySlug =
  | 'peluqueria'
  | 'masajes'
  | 'manicura-pedicura'
  | 'gimnasio'
  | 'estetica'
  | 'yoga';

/**
 * Opciones del selector "¿Dónde?" del Hero.
 *
 *  - `any`: no se filtra por zona (default, busca en todo el catálogo).
 *  - `near-me`: usa la ubicación del usuario; si aún no hay permiso,
 *    al elegirlo se dispara el flujo del provider global.
 *  - Resto: ciudades/zonas predefinidas mapeadas a texto que el
 *    `searchProviders` busca en el `address` del proveedor.
 *
 * Mantenemos la lista corta y manual porque en MVP no tenemos catálogo
 * de ciudades. Cuando integremos PostGIS la sustituiremos por
 * autocomplete real geocodificado.
 */
export type HeroLocationOption = 'any' | 'near-me' | 'barcelona' | 'castellar' | 'llica-vall';

/**
 * Opciones del selector "¿Cuándo?" del Hero.
 *
 * Solo dos opciones, y es deliberado. `now` se traduce a `now=1`, el
 * filtro de disponibilidad que `/buscar` ya entiende; `any` no filtra.
 *
 * Hubo tres más (`today`, `tomorrow`, `this-week`) que escribían un
 * `when=...` que **nadie leía**: el usuario filtraba "mañana" y recibía
 * el catálogo entero. Volverán cuando el motor de disponibilidad sepa
 * responder "¿tiene hueco en este rango de días?", que es una pregunta
 * distinta de la que responde hoy ("¿tiene hueco en los próximos 60
 * minutos?"). Hasta entonces no se reponen: un filtro que no filtra es
 * peor que un filtro que no está.
 */
export type HeroWhenOption = 'now' | 'any';

export interface HeroSearchDraft {
  category: HeroCategorySlug | '';
  location: HeroLocationOption;
  when: HeroWhenOption;
}
