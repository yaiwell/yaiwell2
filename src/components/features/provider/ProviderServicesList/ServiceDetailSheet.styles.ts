/**
 * Estilos del componente `ServiceDetailSheet`.
 *
 * En móvil se presenta como bottom-sheet (slide-up). En desktop como
 * side sheet por la derecha (slide-from-right). Tokens semánticos
 * para coherencia con el resto de la marca y soporte directo de
 * modo oscuro.
 */
export const serviceDetailSheetStyles = {
  overlay:
    'fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  // Mobile: bottom-sheet. Desktop (lg): panel lateral derecho a ancho fijo.
  content:
    'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom lg:inset-y-0 lg:bottom-auto lg:right-0 lg:left-auto lg:h-full lg:max-h-none lg:w-[28rem] lg:rounded-none lg:rounded-l-3xl lg:data-[state=open]:slide-in-from-right lg:data-[state=closed]:slide-out-to-right',

  // Header: título grande + botón cerrar.
  header: 'flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5 md:px-8',
  titleBlock: 'flex flex-col gap-1',
  title: 'font-display text-xl text-foreground md:text-2xl',
  subtitle: 'text-sm text-muted-foreground',
  closeButton:
    'flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',

  // Body: scrolleable si el contenido excede la altura disponible.
  body: 'flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 md:px-8',
  serviceName: 'font-display text-2xl text-foreground md:text-3xl',

  // Bloque de meta: duración, precio, profesional, en tarjetas pequeñas.
  metaGrid: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
  metaItem: 'flex items-start gap-3 rounded-2xl border border-border bg-card p-4',
  metaIcon: 'mt-0.5 size-5 shrink-0 text-muted-foreground',
  metaBody: 'flex min-w-0 flex-col gap-0.5',
  metaLabel: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  metaValue: 'text-sm text-foreground',

  // Descripción.
  descriptionBlock: 'flex flex-col gap-2',
  descriptionLabel: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  descriptionText: 'text-sm leading-relaxed text-foreground/90 whitespace-pre-line',

  // Nota "próximamente".
  comingSoonNote:
    'rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground',

  // Footer pegado abajo con CTA deshabilitado pero estéticamente premium.
  footer: 'mt-auto flex flex-col gap-2 border-t border-border/60 px-6 py-4 md:px-8 md:py-5',
  reserveCta:
    'inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50',
} as const;
