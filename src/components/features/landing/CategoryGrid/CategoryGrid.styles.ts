/**
 * Estilos del componente CategoryGrid.
 *
 * Patrón visual:
 * - Mobile: scroll horizontal con snap. Cards anchas (~70vw) que invitan
 *   a deslizar y mantienen el ritmo táctil tipo app nativa.
 * - Desktop: grid 4 columnas en pantallas grandes, 2 en tablet.
 */
export const categoryGridStyles = {
  root: 'bg-background py-16 md:py-24',
  container: 'mx-auto max-w-7xl px-6 md:px-8',
  header: 'mb-8 flex flex-col gap-2 md:mb-12',
  title: 'text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-5xl',
  subtitle: 'max-w-xl text-sm text-muted-foreground md:text-base',
  scroller:
    'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-4',
  card: 'group relative aspect-[4/5] w-[70vw] shrink-0 snap-center overflow-hidden rounded-3xl bg-muted shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md md:w-auto',
  cardImage:
    'absolute inset-0 -z-10 h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.04]',
  cardOverlay:
    'absolute inset-0 -z-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent',
  cardContent: 'relative z-10 flex h-full flex-col items-start justify-end gap-2 p-5',
  cardIcon:
    'inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-foreground shadow-sm',
  cardTitle: 'text-lg font-semibold text-white md:text-xl',
} as const;
