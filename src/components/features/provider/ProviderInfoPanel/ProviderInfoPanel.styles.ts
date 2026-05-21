/**
 * Estilos del componente ProviderInfoPanel.
 *
 * El layout es vertical en mobile (mapa, dirección, horario,
 * descripción) y pasa a 2 columnas (dirección + horario) en desktop.
 * La descripción es siempre full width al final.
 */
export const providerInfoPanelStyles = {
  section: 'flex flex-col gap-4 py-8 md:py-12',
  heading: 'text-2xl md:text-3xl font-display text-foreground',

  // Mini-mapa
  mapWrapper:
    'relative h-[280px] md:h-[360px] w-full overflow-hidden rounded-3xl border border-border bg-muted',

  // Bloques de información
  grid: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  block: 'flex items-start gap-3 rounded-2xl border border-border bg-card p-5 md:p-6',
  blockIcon: 'h-5 w-5 shrink-0 text-muted-foreground mt-0.5',
  blockBody: 'flex flex-col gap-1',
  blockLabel: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  blockContent: 'text-sm text-foreground',
  scheduleList: 'mt-1 flex flex-col gap-0.5 text-sm text-foreground',
  scheduleRow: 'flex items-center justify-between gap-4',
  scheduleDay: 'text-muted-foreground',

  // Descripción full width
  descriptionBlock: 'flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 md:p-6',
  descriptionText: 'text-sm text-foreground/90 leading-relaxed whitespace-pre-line',
} as const;
