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
  // Notice de éxito tras el guardado real. Verde suave para que se lea
  // como confirmación sin chillar; auto-oculta a los 3s desde la lógica.
  noticeSuccess:
    'rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300',
  // Notice de error: el copy depende del code; estilo destructivo claro.
  noticeError:
    'rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive',
  actions: 'flex justify-end',

  // Card "Próximamente" para añadir otro negocio. Visualmente más
  // ligero que las cards de formulario (`bg-muted/40` en vez de
  // `bg-card`) para que se lea como roadmap, no como funcionalidad
  // activa. El botón queda deshabilitado pero clickable visualmente.
  multiBusinessCard:
    'flex flex-col gap-3 rounded-3xl border border-dashed border-border/60 bg-muted/40 p-6 sm:flex-row sm:items-center sm:justify-between',
  multiBusinessInfo: 'flex flex-col gap-1',
  multiBusinessTitle: 'flex items-center gap-2 font-display text-lg text-foreground',
  multiBusinessChip:
    'rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
  multiBusinessDescription: 'text-sm text-muted-foreground',
  multiBusinessButton:
    'inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-border/60 bg-background px-5 py-2.5 text-sm font-medium text-muted-foreground sm:w-auto',
} as const;
