/**
 * Estilos de VerificationDetail.
 *
 * Layout en dos columnas en desktop: izquierda con datos del candidato
 * y descripción, derecha con grid de documentos. En móvil se apilan.
 * Las acciones aprobar/rechazar quedan sticky al pie en móvil para
 * no perder el CTA al hacer scroll.
 */
export const verificationDetailStyles = {
  root: 'flex flex-col gap-8',
  topRow: 'flex flex-col gap-2',
  back: 'inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground',
  name: 'font-display text-3xl leading-tight text-foreground sm:text-4xl',
  subtitle: 'text-sm text-muted-foreground',
  grid: 'grid gap-8 lg:grid-cols-[3fr_2fr]',
  block: 'flex flex-col gap-3',
  blockTitle: 'font-display text-lg text-foreground',
  dl: 'grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm',
  dtLabel: 'text-muted-foreground',
  ddValue: 'text-foreground',
  description: 'rounded-2xl bg-muted/50 p-4 text-sm leading-relaxed text-foreground/90',
  docsGrid: 'grid grid-cols-2 gap-3',
  docCard: 'flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm',
  docImage: 'aspect-video w-full overflow-hidden rounded-xl bg-muted',
  docImageInner: 'h-full w-full object-cover',
  docType: 'text-xs uppercase tracking-wider text-muted-foreground',
  docFilename: 'truncate text-sm font-medium text-foreground',
  actions:
    'sticky bottom-4 z-10 mt-4 flex flex-col-reverse gap-3 rounded-3xl border border-border/70 bg-card/95 p-4 shadow-md backdrop-blur sm:flex-row sm:items-center sm:justify-end',
  reject:
    'inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60',
  approve:
    'inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60',
  toast:
    'fixed inset-x-4 bottom-24 z-20 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-border bg-foreground px-4 py-3 text-sm text-background shadow-lg sm:bottom-8',
  toastClose: 'rounded-full px-2 py-1 text-xs text-background/80 hover:text-background',
} as const;
