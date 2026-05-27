/**
 * Estilos del orquestador del flujo de reserva.
 *
 * Mantiene un layout limpio mobile-first con un contenedor central
 * estrecho, indicador de paso superior y zona de contenido que el
 * paso activo rellena.
 */
export const bookingFlowStyles = {
  root: 'mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10',

  // Cabecera con título de paso y volver.
  header: 'flex flex-col gap-1',
  eyebrow: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  title: 'font-display text-2xl text-foreground md:text-3xl',
  serviceLine: 'text-sm text-muted-foreground',

  // Indicador de pasos: 4 puntos conectados.
  stepper: 'mt-2 flex items-center gap-2',
  stepDot: 'size-2 rounded-full bg-border',
  stepDotActive: 'size-2 rounded-full bg-primary',
  stepDotDone: 'size-2 rounded-full bg-primary/60',

  // Contenido del paso activo: tarjeta con padding generoso.
  card: 'rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7',

  // Pie del flujo: navegación entre pasos.
  footer: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
  backButton:
    'inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50',
  primaryButton:
    'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto',

  // Texto de política breve mostrado bajo el footer.
  policyNote: 'text-xs leading-relaxed text-muted-foreground',
} as const;
