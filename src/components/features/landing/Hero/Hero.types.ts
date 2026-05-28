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
  location: string;
  /**
   * Si es `true`, ignoramos `location` y enviamos `near=me` al search,
   * que activará el filtro "Cerca de ti" usando la ubicación del usuario.
   */
  useNearMe: boolean;
  when: HeroWhenOption;
}
