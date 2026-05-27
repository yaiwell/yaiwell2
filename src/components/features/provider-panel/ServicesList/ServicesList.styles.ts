/**
 * Estilos del listado de servicios del panel.
 *
 * Diseño tipo tarjeta apilada: cada servicio ocupa una fila completa
 * con nombre, descripción, métricas y acciones secundarias. En desktop
 * pasamos a un layout más horizontal con el precio destacado a la
 * derecha.
 */
export const servicesListStyles = {
  root: 'flex flex-col gap-6',
  header: 'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between',
  headerText: 'flex flex-col gap-1',
  title: 'font-display text-2xl text-foreground',
  subtitle: 'text-sm text-muted-foreground',

  list: 'flex flex-col gap-3',
  empty:
    'flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground',

  card: 'flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-start sm:justify-between',
  cardMain: 'flex flex-1 flex-col gap-2',
  cardHeader: 'flex flex-wrap items-center gap-2',
  cardName: 'font-display text-lg text-foreground',
  cardCategoryChip:
    'inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80',
  cardStatusActive:
    'inline-flex items-center rounded-full bg-brand-sage-soft px-2 py-0.5 text-xs font-medium text-brand-sage',
  cardStatusPaused:
    'inline-flex items-center rounded-full bg-brand-butter-soft px-2 py-0.5 text-xs font-medium text-brand-butter',
  cardDescription: 'text-sm leading-relaxed text-muted-foreground',
  cardMeta: 'flex flex-wrap items-center gap-3 text-xs text-muted-foreground',
  cardMetaIcon: 'size-3.5',

  cardAside: 'flex shrink-0 flex-col items-start gap-2 sm:items-end',
  cardPrice: 'font-display text-xl text-foreground',
  cardActions: 'flex flex-wrap items-center gap-2',
} as const;
