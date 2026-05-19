/**
 * Estilos del campo de búsqueda principal.
 *
 * Estética: redondeado generoso, fondo card, icono lupa a la izquierda,
 * sin sombra (el contenedor padre ya da elevación).
 * Paleta semántica de marca (sin `stone-*`).
 */
export const searchBarStyles = {
  form: 'relative flex w-full items-center',
  iconLeft: 'pointer-events-none absolute left-4 flex h-full items-center text-muted-foreground',
  input:
    'h-12 w-full rounded-full border border-border bg-card pl-11 pr-12 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-shadow focus:ring-2 focus:ring-primary/30 focus:border-primary/40 sm:h-13 sm:text-base',
  clearButton:
    'absolute right-2 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
} as const;
