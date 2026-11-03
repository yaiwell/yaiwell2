/**
 * Estilos del selector de profesional.
 *
 * Fichas seleccionables con radio nativo oculto a la vista pero no al
 * teclado ni al lector: las flechas cambian de opción como en cualquier
 * grupo de radios. Móvil primero: las fichas fluyen en varias líneas y
 * la marcada se distingue por borde y fondo, no solo por color.
 */
export const professionalPickerStyles = {
  root: 'flex flex-col gap-3',
  legend: 'mb-1 text-sm font-medium text-foreground',
  options: 'flex flex-wrap gap-2',
  option:
    'flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-4 pl-1.5 text-sm text-foreground transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40',
  radio: 'sr-only',
  anyIcon:
    'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/70 ring-1 ring-border',
  anyIconSvg: 'size-4',
  optionName: 'font-medium',
  hint: 'text-xs leading-relaxed text-muted-foreground',
} as const;
