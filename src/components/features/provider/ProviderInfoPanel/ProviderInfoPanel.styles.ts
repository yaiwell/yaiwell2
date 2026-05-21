/**
 * Estilos del componente ProviderInfoPanel.
 *
 * El layout es vertical en mobile (mapa, dirección, horario,
 * descripción) y pasa a 2 columnas (dirección + horario) en desktop.
 * La descripción es siempre full width al final.
 *
 * Apostamos por un layout abierto sin cajas bordeadas para una estética
 * editorial premium: cada bloque vive en su propio espacio, separado
 * por aire en lugar de bordes.
 */
export const providerInfoPanelStyles = {
  section: 'flex flex-col gap-4 py-8 md:py-12',
  heading: 'text-2xl md:text-3xl font-display text-foreground',

  // Mini-mapa
  mapWrapper:
    'relative h-[280px] md:h-[360px] w-full overflow-hidden rounded-3xl border border-border bg-muted',

  // Bloques de información — layout abierto, sin caja, separados por aire.
  grid: 'grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-12 md:gap-y-10',
  block: 'flex flex-col gap-3',
  blockBody: 'flex flex-col gap-1',
  blockLabel: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  blockContent: 'text-sm text-foreground',
  scheduleList: 'mt-1 flex flex-col gap-0.5 text-sm text-foreground',
  scheduleRow: 'flex items-center justify-between gap-4',
  scheduleDay: 'text-muted-foreground',

  // Descripción full width — sin caja, tipografía más ligera y respiro.
  descriptionBlock: 'flex flex-col gap-4 mt-2',
  descriptionText:
    'text-base md:text-lg leading-[1.7] text-foreground/85 max-w-[62ch] font-light whitespace-pre-line',
} as const;
