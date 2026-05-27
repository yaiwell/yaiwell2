/**
 * Estilos del autocomplete del buscador.
 *
 * Filosofía:
 *  - El input hereda la estética del SearchBar existente (mismo aspecto
 *    en `/buscar`) y, cuando se usa dentro del Hero, se renderiza con
 *    estilos transparentes inyectados por el caller (clase opcional).
 *  - El dropdown es flotante absoluto, anclado al wrapper relativo del
 *    form. Sombras suaves para mantener la estética earthy/premium.
 */
export const searchAutocompleteStyles = {
  // Wrapper relativo necesario para anclar el listbox.
  root: 'relative w-full',
  form: 'relative flex w-full items-center',
  iconLeft: 'pointer-events-none absolute left-4 flex h-full items-center text-muted-foreground',
  input:
    'h-12 w-full rounded-full border border-border bg-card pl-11 pr-12 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-shadow focus:ring-2 focus:ring-primary/30 focus:border-primary/40 sm:h-13 sm:text-base',
  clearButton:
    'absolute right-2 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',

  // Dropdown
  // Sombra/ring usan opacidad sobre negro porque actúan como elevación
  // foto-agnóstica (depth shadow), no como color de tema. En dark el
  // contraste se mantiene gracias al borde border y al fondo bg-card.
  listbox:
    'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-80 overflow-y-auto rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/10 ring-1 ring-black/5',
  listboxInner: 'flex flex-col py-2',
  emptyRow: 'px-4 py-3 text-sm text-muted-foreground',

  option:
    'flex w-full cursor-pointer items-start gap-3 px-4 py-2.5 text-left transition-colors focus:outline-none',
  optionIdle: 'bg-transparent text-foreground',
  optionActive: 'bg-muted text-foreground',
  optionIcon:
    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground',
  optionBody: 'flex min-w-0 flex-1 flex-col gap-0.5',
  optionLabel: 'text-sm font-medium text-foreground',
  optionLabelMatch: 'rounded-sm bg-brand-sage-soft/60 px-0.5 font-semibold text-foreground',
  optionSublabel: 'truncate text-xs text-muted-foreground',
  optionTypeBadge:
    'shrink-0 self-center text-[10px] uppercase tracking-wider text-muted-foreground',
} as const;
