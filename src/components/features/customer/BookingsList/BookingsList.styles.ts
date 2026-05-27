/**
 * Estilos de BookingsList.
 *
 * Tres secciones apiladas verticalmente con encabezado discreto y
 * grid de cards. En móvil cada card ocupa todo el ancho; en desktop
 * mostramos una sola columna para que la card horizontal respire.
 */
export const bookingsListStyles = {
  root: 'flex flex-col gap-12',
  section: 'flex flex-col gap-4',
  sectionHeader: 'flex items-baseline justify-between gap-3',
  sectionTitle: 'font-display text-xl text-foreground',
  sectionCount: 'text-sm text-muted-foreground',
  grid: 'grid gap-4',
  empty:
    'rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground',
} as const;
