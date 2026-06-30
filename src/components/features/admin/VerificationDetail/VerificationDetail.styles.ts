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
  back: 'inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
    'inline-flex items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-5 py-2.5 text-sm font-medium text-destructive transition-colors duration-150 hover:bg-destructive/20 focus-visible:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
  // El fondo `bg-brand-sage` es verde claro en ambos modos (L0.72/0.83);
  // por eso forzamos un texto plum oscuro fijo (no `text-primary-foreground`,
  // que en dark se vuelve cream y desaparece sobre el sage claro).
  approve:
    'inline-flex items-center justify-center gap-2 rounded-full bg-brand-sage px-5 py-2.5 text-sm font-medium text-[oklch(0.22_0.025_350)] transition-colors duration-150 hover:bg-brand-sage/90 focus-visible:bg-brand-sage/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sage/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
  // El toast aparece con un fade+slide-up para no irrumpir bruscamente.
  toast:
    'fixed inset-x-4 bottom-24 z-20 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-border bg-foreground px-4 py-3 text-sm text-background shadow-lg duration-200 animate-in fade-in slide-in-from-bottom-2 sm:bottom-8',
  toastClose:
    'rounded-full px-2 py-1 text-xs text-background/80 transition-colors duration-150 hover:text-background focus-visible:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/40',
  // Banner inline cuando una action devuelve error (excepto NOTES_REQUIRED,
  // que se pinta dentro del propio AlertDialog).
  errorBanner:
    'rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive',
  // AlertDialog para rechazar: overlay oscuro + panel centrado con
  // backdrop blur, mismo lenguaje visual que el ServiceDeleteButton.
  dialogOverlay:
    'fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm duration-150 animate-in fade-in',
  dialogContent:
    'fixed left-1/2 top-1/2 z-40 flex w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-xl duration-150 animate-in fade-in zoom-in-95',
  dialogTitle: 'font-display text-lg text-foreground',
  dialogDescription: 'text-sm leading-relaxed text-muted-foreground',
  dialogLabel: 'text-xs font-medium uppercase tracking-wider text-muted-foreground',
  dialogTextarea:
    'w-full resize-y rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  dialogError: 'text-sm text-destructive',
  dialogActions: 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
  dialogCancel:
    'inline-flex items-center justify-center rounded-full border border-border/70 bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  dialogConfirm:
    'inline-flex items-center justify-center rounded-full border border-destructive/30 bg-destructive/15 px-5 py-2.5 text-sm font-medium text-destructive transition-colors duration-150 hover:bg-destructive/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
} as const;
