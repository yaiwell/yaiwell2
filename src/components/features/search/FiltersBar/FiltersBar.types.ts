/** Categoría raíz ya localizada, tal y como la pinta el chip. */
export interface FiltersBarCategory {
  id: string;
  slug: string;
  /** Nombre visible en el locale activo (resuelto en servidor). */
  label: string;
}

export interface FiltersBarProps {
  /**
   * Categorías raíz que se pintan como chips. Llegan de la BD vía la
   * page: así una categoría nueva aparece sin tocar código ni mensajes.
   */
  categories: FiltersBarCategory[];
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
