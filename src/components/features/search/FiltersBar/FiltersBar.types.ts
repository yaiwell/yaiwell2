export interface FiltersBarProps {
  /** Slug de la categoría raíz activa, o `null` si "Todas". */
  activeCategorySlug: string | null;
  /** Estado del toggle "solo disponibles ahora". */
  availabilityOnly: boolean;
  /** Indica si hay filtros avanzados activos (mostrar punto en botón). */
  hasAdvancedFilters: boolean;
  /** Estado del toggle "Cerca de ti" (filtra por radio respecto al usuario). */
  nearMeOnly: boolean;
  /** Radio (en km) que aplica el chip "Cerca de ti", para etiqueta accesible. */
  nearMeRadiusKm: number;
  /** Cambia la categoría activa. `null` = quitar filtro. */
  onCategoryChange: (slug: string | null) => void;
  /** Toggle del badge "ahora". */
  onAvailabilityToggle: (next: boolean) => void;
  /** Toggle del chip "Cerca de ti". */
  onNearMeToggle: () => void;
  /** Abre el sheet de filtros avanzados. */
  onOpenFiltersSheet: () => void;
}
