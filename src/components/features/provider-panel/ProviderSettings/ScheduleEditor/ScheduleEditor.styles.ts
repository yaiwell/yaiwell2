/**
 * Estilos del `ScheduleEditor`.
 *
 * Layout en bloques por día: a la izquierda la etiqueta del día y el
 * toggle abierto/cerrado; a la derecha la lista de tramos. En mobile
 * los tramos se apilan; en sm+ se ponen en fila para aprovechar
 * el ancho disponible del card de settings.
 */
export const scheduleEditorStyles = {
  root: 'flex flex-col gap-4',
  dayRow: 'flex flex-col gap-2 border-b border-border/40 pb-4 last:border-b-0 last:pb-0',
  dayHeader: 'flex flex-wrap items-center justify-between gap-3',
  dayLabel: 'text-sm font-medium text-foreground',
  toggleLabel: 'inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground',
  toggleInput:
    'h-4 w-4 rounded border-border accent-foreground cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
  blocksColumn: 'flex flex-col gap-2 pl-1',
  blockRow: 'flex flex-wrap items-center gap-2',
  timeInput:
    'rounded-lg border border-border/70 bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  timeSeparator: 'text-sm text-muted-foreground',
  iconButton:
    'inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  addBlockButton:
    'inline-flex items-center gap-1 self-start rounded-full border border-dashed border-border/70 px-3 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  closedHint: 'text-sm italic text-muted-foreground',
} as const;
