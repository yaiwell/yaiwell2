/**
 * Estilos del orquestador de búsqueda.
 *
 * Layout responsive:
 *  - Móvil/Tablet: barra sticky arriba, contenido a pantalla completa
 *    debajo (lista o mapa según pestaña).
 *  - Desktop (≥1024px): split 50/50 con lista a la izquierda y mapa
 *    sticky a la derecha.
 */
export const searchViewStyles = {
  root: 'flex flex-1 flex-col bg-stone-50/40',
  stickyTop:
    'sticky top-0 z-30 flex flex-col gap-3 border-b border-stone-200/70 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4',
  topInner: 'mx-auto flex w-full max-w-7xl flex-col gap-3',
  headerRow: 'flex items-center justify-between gap-3',
  headerTitle: 'font-serif text-lg text-stone-900 sm:text-xl',
  resultsCount: 'text-sm text-stone-500',
  mobileTabs: 'flex items-center gap-1 self-stretch rounded-full bg-stone-100 p-1 sm:hidden',
  mobileTabBase:
    'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors',
  mobileTabIdle: 'text-stone-600',
  mobileTabActive: 'bg-white text-stone-900 shadow-sm',
  body: 'mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6',
  splitGrid: 'grid w-full grid-cols-1 gap-6 lg:grid-cols-2',
  listColumn: 'flex flex-col gap-4',
  mapColumn: 'sticky top-[124px] hidden h-[calc(100dvh-160px)] lg:block',
  mobileListPanel: 'lg:hidden',
  mobileMapPanel: 'lg:hidden h-[calc(100dvh-180px)]',
} as const;
