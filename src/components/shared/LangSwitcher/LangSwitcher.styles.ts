/**
 * Estilos del componente LangSwitcher.
 *
 * Con 4 idiomas el toggle pill se mantiene viable (caben los 4 códigos
 * de 2 chars) pero el `compact` (mobile) pasa a dropdown nativo para no
 * comerse el header — un toggle de 4 botones rompería el layout en
 * 375px. Las clases del root cambian según `variant`.
 */
export const langSwitcherStyles = {
  root: 'inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 text-xs font-medium',
  button:
    'inline-flex h-7 min-w-9 items-center justify-center rounded-full px-2.5 uppercase tracking-wide text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-95',
  buttonActive: 'bg-foreground text-background hover:text-background',
  select:
    'h-8 rounded-full border border-border bg-background px-3 text-xs font-medium uppercase tracking-wide text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
} as const;
