/**
 * Estilos del componente AddressAutocomplete.
 *
 * Filosofía:
 *  - Input con la estética shadcn (borde sutil + focus ring del tema).
 *  - Listbox flotante con `bg-popover` y `shadow-md` (shadcn-like).
 *  - Mobile-first: en <640px el listbox ocupa el ancho del wrapper.
 *  - Tema dark/light delegado en las CSS vars del tema (no hardcodeamos
 *    colores literales para que dark mode se herede sin tocar nada).
 */
export const addressAutocompleteStyles = {
  // Wrapper relativo para anclar el listbox flotante al input padre.
  root: 'relative w-full',
  label: 'mb-1.5 block text-sm font-medium text-foreground',
  fieldWrapper: 'relative flex w-full items-center',

  iconLeft: 'pointer-events-none absolute left-3 flex h-full items-center text-muted-foreground',
  input:
    'h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',

  clearButton:
    'absolute right-1.5 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',

  // Listbox flotante.
  // `max-h-72` con scroll interno para no desbordar el viewport.
  // Bordes shadcn: border + bg-popover + shadow-md + rounded-md.
  listbox:
    'absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50 max-h-72 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md',
  listboxInner: 'flex flex-col py-1',

  // Mensajes de estado dentro del popover.
  statusRow: 'px-3 py-2 text-sm text-muted-foreground',
  errorRow: 'px-3 py-2 text-sm text-destructive',

  // Opciones del listbox: hover y selección por teclado comparten estilo
  // para que la afinidad visual no dependa de qué dispositivo se use.
  option:
    'flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground focus:outline-none',
  optionIcon: 'mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground',
  optionBody: 'flex min-w-0 flex-1 flex-col',
  optionName: 'truncate text-sm font-medium',
  optionFullAddress: 'truncate text-xs text-muted-foreground',

  // Spinner sutil dentro del input mientras hay request en vuelo.
  loadingSpinner:
    'absolute right-9 flex size-4 items-center justify-center text-muted-foreground motion-safe:animate-spin',
} as const;
