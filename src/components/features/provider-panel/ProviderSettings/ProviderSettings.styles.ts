/**
 * Estilos de la pantalla de configuración del centro.
 *
 * Tres bloques apilados (datos generales, dirección, horario, fotos)
 * cada uno como tarjeta independiente. En desktop algunos formularios
 * pasan a layout de 2 columnas para aprovechar el ancho.
 */
export const providerSettingsStyles = {
  root: 'flex flex-col gap-6',
  header: 'flex flex-col gap-1',
  title: 'font-display text-2xl text-foreground',
  subtitle: 'text-sm text-muted-foreground',

  card: 'flex flex-col gap-5 rounded-3xl border border-border/60 bg-card p-6 shadow-sm',
  cardTitle: 'font-display text-lg text-foreground',
  cardSubtitle: 'text-sm text-muted-foreground',

  fieldGrid: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
  field: 'flex flex-col gap-1.5',
  label: 'text-sm font-medium text-foreground',
  input:
    'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
  textarea:
    'min-h-[100px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',

  scheduleRow:
    'flex flex-col gap-2 rounded-2xl border border-border/40 bg-background p-3 sm:flex-row sm:items-center sm:justify-between',
  scheduleLabel: 'text-sm font-medium text-foreground',
  scheduleControls: 'flex items-center gap-2',
  scheduleTime:
    'h-9 w-24 rounded-lg border border-border bg-background px-2 text-sm text-foreground',
  scheduleClosed: 'text-xs font-medium text-muted-foreground',

  photoGrid: 'grid grid-cols-2 gap-3 sm:grid-cols-3',
  photoTile: 'relative aspect-square overflow-hidden rounded-2xl border border-border/40 bg-muted',
  photoImg: 'h-full w-full object-cover',
  photoAdd:
    'flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background text-sm text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-foreground focus-visible:border-primary focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]',

  notice:
    'rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground',
  actions: 'flex justify-end',
} as const;
