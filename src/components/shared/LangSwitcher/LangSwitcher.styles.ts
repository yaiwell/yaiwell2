/**
 * Estilos del componente LangSwitcher.
 *
 * Usamos un toggle pill con dos botones internos en lugar de un dropdown:
 * con solo dos idiomas (es/ca) un dropdown es overkill y un toggle hace
 * explícita la otra opción.
 */
export const langSwitcherStyles = {
  root: 'inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 text-xs font-medium',
  button:
    'inline-flex h-7 min-w-9 items-center justify-center rounded-full px-2.5 uppercase tracking-wide text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-95',
  buttonActive: 'bg-foreground text-background hover:text-background',
} as const;
