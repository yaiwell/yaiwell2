/**
 * Estilos del aviso de límite de servicios del plan.
 * Tono informativo, no de error: llegar al límite es normal y la salida
 * es mejorar de plan, no corregir nada.
 */
export const planLimitNoticeStyles = {
  root: 'flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between',
  message: 'text-sm text-muted-foreground',
  cta: 'inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline',
  ctaIcon: 'size-4',
} as const;
