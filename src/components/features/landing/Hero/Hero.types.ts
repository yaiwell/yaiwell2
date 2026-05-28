/**
 * Tipos del componente Hero de la landing.
 *
 * Los slugs de categoría se replicarán en el otro agente (fake-data); por
 * ahora los modelamos como una unión literal para el dropdown de la barra
 * de búsqueda y validamos en build si alguien añade uno fuera del set.
 */
export type HeroCategorySlug =
  | 'peluqueria'
  | 'masajes'
  | 'manicura'
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
 * `now` mantiene compatibilidad con el filtro existente del SearchView
 * (`availabilityOnly` vía `now=1`). El resto se propagan en la URL
 * como `when=...` para que la página de búsqueda pueda filtrar por
 * franja temporal cuando dispongamos de slots reales (Fase 1).
 */
export type HeroWhenOption = 'now' | 'today' | 'tomorrow' | 'this-week' | 'any';

export interface HeroSearchDraft {
  category: HeroCategorySlug | '';
  location: HeroLocationOption;
  when: HeroWhenOption;
}
