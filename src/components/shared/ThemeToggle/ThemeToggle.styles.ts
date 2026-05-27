/**
 * Estilos del componente ThemeToggle.
 *
 * Usamos un toggle pill con tres botones internos (light / dark / system),
 * misma forma visual que `LangSwitcher` para mantener coherencia en el
 * Header. Cada botón es cuadrado para que el icono respire sin etiqueta.
 */
export const themeToggleStyles = {
  root: 'inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 text-xs font-medium',
  button:
    'inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
  buttonActive: 'bg-foreground text-background hover:text-background',
  icon: 'size-3.5',
  srOnly: 'sr-only',
} as const;
