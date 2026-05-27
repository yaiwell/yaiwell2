/**
 * Estilos del componente LocationPill.
 *
 * Pill compacto del Header. En mobile colapsa a sólo icono; en desktop
 * muestra icono + etiqueta corta. Usa tokens semánticos para que se
 * adapte a light/dark sin variantes adicionales.
 */
export const locationPillStyles = {
  // Contenedor relativo para anclar el popover absoluto.
  root: 'relative inline-flex',
  // Botón principal. En mobile sólo el icono cabe; en `sm+` aparece la
  // etiqueta. `aria-expanded` activa el highlight visual nativo del
  // botón ghost (ver button.tsx variants).
  trigger:
    'inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 aria-expanded:bg-muted aria-expanded:text-foreground sm:px-3',
  triggerIcon: 'size-4 shrink-0',
  // La etiqueta se oculta en pantallas muy estrechas y aparece a partir
  // de `sm` (≥640px). En mobile el aria-label cubre la accesibilidad.
  triggerLabel: 'hidden max-w-[8rem] truncate sm:inline',
  // Color del icono según estado: en `granted` queremos un guiño verde
  // sin perder contraste, así que reforzamos con `text-foreground`
  // (negro/crema según tema). En el resto mantenemos `muted` para no
  // gritar visualmente.
  iconGranted: 'text-foreground',
  iconMuted: 'text-muted-foreground',
  // Popover anclado a la derecha del trigger. `top-full mt-2` deja un
  // pequeño hueco. `z-50` lo mantiene por encima del Header sticky.
  popover:
    'absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl shadow-foreground/5',
  popoverHeader: 'flex items-start gap-3',
  popoverIconBubble:
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-sage-soft text-foreground',
  popoverIconBubbleSvg: 'size-4',
  popoverTitleBlock: 'flex min-w-0 flex-1 flex-col gap-1',
  popoverTitle: 'font-display text-sm font-semibold leading-tight text-foreground',
  popoverBody: 'text-xs text-muted-foreground',
  popoverActions: 'mt-4 flex flex-col gap-2',
  popoverHelp: 'mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground',
  // Animación de spinner reutilizada para el estado `requesting`.
  spinner: 'size-4 animate-spin',
} as const;
