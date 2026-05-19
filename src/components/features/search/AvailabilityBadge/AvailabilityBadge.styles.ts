/**
 * Estilos del badge de disponibilidad.
 *
 * Mantenemos dos variantes:
 *  - `subtle`: fondo translúcido sobre fotos o cards claras.
 *  - `solid`: fondo plano, contraste fuerte para usar en CTA o mapa.
 *
 * Colores (contraste reforzado tras audit de accesibilidad):
 *  - now   → verde con contraste AA sobre fondo claro.
 *  - soon  → ámbar cálido.
 *  - busy  → neutro de la paleta semántica (sin `stone-*`).
 */
export const availabilityBadgeStyles = {
  base: 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none transition-colors',
  dot: 'inline-block size-1.5 rounded-full',
  subtle: {
    available_now: 'bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-300/60',
    available_soon: 'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300/60',
    busy: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
  },
  solid: {
    available_now: 'bg-emerald-600 text-white',
    available_soon: 'bg-amber-500 text-white',
    busy: 'bg-muted-foreground text-background',
  },
  dotColor: {
    available_now: 'bg-emerald-500',
    available_soon: 'bg-amber-500',
    busy: 'bg-muted-foreground',
  },
} as const;
