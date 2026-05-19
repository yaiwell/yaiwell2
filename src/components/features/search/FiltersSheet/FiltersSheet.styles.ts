/**
 * Estilos del FiltersSheet.
 *
 * En móvil se presenta como bottom-sheet (animación slide-up).
 * En desktop como modal centrado, con max-width para no estirarse.
 *
 * Paleta semántica: usa tokens (`text-foreground`, `bg-card`, `bg-primary`,
 * etc.) en lugar de `stone-*` para alinear con la marca.
 */
export const filtersSheetStyles = {
  overlay:
    'fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  content:
    'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-card p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl',
  header: 'mb-5 flex items-start justify-between gap-4',
  titleBlock: 'flex flex-col gap-1',
  title: 'font-display text-xl text-foreground',
  description: 'text-sm text-muted-foreground',
  closeButton:
    'flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  section: 'flex flex-col gap-3 border-t border-border/60 py-5 first-of-type:border-t-0',
  sectionLabel: 'text-sm font-medium text-foreground',
  priceRow: 'flex flex-wrap gap-2',
  priceChip:
    'inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  priceChipIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  priceChipActive: 'border-primary bg-primary text-primary-foreground',
  ratingRow: 'flex flex-wrap gap-2',
  ratingChip:
    'inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  ratingChipIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  ratingChipActive: 'border-primary bg-primary text-primary-foreground',
  footer: 'mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-5',
  applyButton:
    'inline-flex h-11 flex-1 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
  clearButton:
    'inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
} as const;
