/**
 * Estilos del orquestador de búsqueda.
 *
 * Layout responsive:
 *  - Móvil/Tablet: barra sticky arriba, contenido a pantalla completa
 *    debajo (lista o mapa según pestaña).
 *  - Desktop (≥1024px): split 50/50 con lista a la izquierda y mapa
 *    sticky a la derecha.
 *
 * Paleta semántica alineada con la marca (sin `stone-*`).
 */
export const searchViewStyles = {
  root: 'flex flex-1 flex-col bg-muted/30',
  stickyTop:
    'sticky top-0 z-30 flex flex-col gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4',
  topInner: 'mx-auto flex w-full max-w-7xl flex-col gap-3',
  headerRow: 'flex items-center justify-between gap-3',
  headerTitle: 'font-display text-lg text-foreground sm:text-xl',
  resultsCount: 'text-sm text-muted-foreground',
  // Tabs Lista/Mapa: visibles hasta que arranca el split desktop en `lg`.
  // Antes estaban en `sm:hidden`, lo que dejaba un hueco 640-1024px sin
  // forma de alternar y el mapa permanecía oculto.
  mobileTabs: 'flex items-center gap-1 self-stretch rounded-full bg-muted p-1 lg:hidden',
  mobileTabBase:
    'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  mobileTabIdle: 'text-muted-foreground',
  mobileTabActive: 'bg-card text-foreground shadow-sm',
  body: 'mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6',
  splitGrid: 'grid w-full grid-cols-1 gap-6 lg:grid-cols-2',
  listColumn: 'flex flex-col gap-4',
  // Base sin `hidden`: el componente añade la visibilidad condicional
  // según la pestaña activa para que las utilidades de mobile puedan
  // sobreescribirla sin pelearse con la cascada.
  mapColumn: 'lg:sticky lg:top-[124px] lg:h-[calc(100dvh-160px)]',
  mobileListPanel: 'lg:hidden',
  mobileMapPanel: 'block h-[calc(100dvh-180px)] lg:hidden',
  // Empty state propio del filtro "Cerca de ti": misma estética que el
  // empty genérico de ProviderList pero con CTA explícito para apagar
  // el filtro. Mantenemos `animate-in fade-in` para suavizar la
  // transición cuando el toggle vacía la lista.
  nearMeEmpty:
    'flex flex-col items-start gap-3 rounded-3xl border border-dashed border-border bg-muted/40 p-8 text-foreground/80 duration-200 animate-in fade-in',
  nearMeEmptyTitle: 'font-display text-xl text-foreground',
  nearMeEmptySubtitle: 'text-sm text-muted-foreground',
  nearMeEmptyCta:
    'mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
} as const;
