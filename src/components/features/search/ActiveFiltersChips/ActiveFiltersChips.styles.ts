/**
 * Estilos de los chips de filtros activos.
 *
 * Diseño: chips pill compactos con X visible al pasar el ratón o
 * cuando reciben foco por teclado. Coherentes con la barra de
 * categorías del FiltersBar para mantener un único lenguaje visual.
 */
export const activeFiltersChipsStyles = {
  root: 'flex w-full flex-wrap items-center gap-2',
  chip: 'group/chip inline-flex items-center gap-1.5 rounded-full border border-border bg-card pl-3 pr-1.5 py-1 text-xs font-medium text-foreground/80 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted',
  chipLabel: 'truncate max-w-[180px]',
  chipRemove:
    'inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  clearAll:
    'ml-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
} as const;
