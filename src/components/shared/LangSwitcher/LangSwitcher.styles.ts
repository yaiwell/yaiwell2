/**
 * Estilos del componente LangSwitcher.
 *
 * El botón usa la misma altura y borde que el resto de controles de la
 * cabecera (ubicación, tema) para que la fila se lea como un conjunto.
 */
export const langSwitcherStyles = {
  // `w-auto` anula el `w-full` del SelectTrigger base, pensado para formularios.
  trigger:
    'h-9 w-auto gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:bg-muted',
  // En móvil el globo sobra: el código ya se entiende y ahorramos ancho.
  triggerCompact: 'px-2.5 [&>svg:first-child]:hidden',
  globe: 'size-3.5 text-muted-foreground',
  content: 'min-w-40',
} as const;
