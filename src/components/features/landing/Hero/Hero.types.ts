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

export interface HeroSearchDraft {
  category: HeroCategorySlug | '';
  location: string;
  /** Si es `true`, ignoramos `whenAt` y pasamos `now=1` al search. */
  whenNow: boolean;
}
