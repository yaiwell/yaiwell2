/**
 * Estilos de la barra de filtros principales.
 *
 * Disposición:
 *  - chips de categorías raíz (scrollable horizontal en móvil).
 *  - toggle "solo ahora" (chip destacado en verde cuando activo).
 *  - botón "Filtros" que abre el sheet.
 */
export const filtersBarStyles = {
  root: 'flex w-full items-center gap-2',
  chipsScroll:
    'flex flex-1 min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  chipBase:
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
  chipIdle: 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
  chipActive: 'border-stone-900 bg-stone-900 text-white',
  toggleNow:
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
  toggleNowIdle: 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
  toggleNowActive: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  filterButton:
    'relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-50',
  filterButtonDot:
    'absolute -right-0.5 -top-0.5 size-2 rounded-full bg-stone-900 ring-2 ring-white',
} as const;
