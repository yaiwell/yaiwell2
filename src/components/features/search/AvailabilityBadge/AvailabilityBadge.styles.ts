/**
 * Estilos del badge de disponibilidad.
 *
 * Mantenemos dos variantes:
 *  - `subtle`: fondo translúcido sobre fotos o cards claras.
 *  - `solid`: fondo plano, contraste fuerte para usar en CTA o mapa.
 *
 * La variante `subtle` usa los tokens semánticos `status-*` de
 * globals.css: cada par fondo/texto llega a ≥ 4.5:1 en claro y oscuro.
 * Antes pintaba `text-brand-*` sobre `brand-*-soft`, que en claro daba
 * 2.0:1 (sage) y 1.6:1 (butter) (auditoría 2026-10-27, P0 #1).
 *  - now   → familia sage (verde de marca).
 *  - soon  → familia butter (ocre cálido de marca).
 *  - busy  → neutro.
 *
 * El punto usa el color del texto del estado para que también supere
 * 3:1 como elemento gráfico (WCAG 1.4.11) sobre el fondo suave.
 */
export const availabilityBadgeStyles = {
  base: 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none transition-colors',
  dot: 'inline-block size-1.5 rounded-full',
  subtle: {
    available_now:
      'bg-status-now text-status-now-foreground ring-1 ring-inset ring-status-now-foreground/25',
    available_soon:
      'bg-status-soon text-status-soon-foreground ring-1 ring-inset ring-status-soon-foreground/25',
    busy: 'bg-status-busy text-status-busy-foreground ring-1 ring-inset ring-border',
  },
  // Variante `solid`: el fondo brand-* es claro en AMBOS modos (L0.72-0.90),
  // así que el texto debe ser SIEMPRE oscuro. Antes usábamos
  // `text-primary-foreground` (cream): en light daba ~3:1 marginal y en
  // dark daba ~1.2:1 (invisible). Usamos el plum oscuro del foreground
  // light fijado para garantizar AA en ambos modos.
  solid: {
    available_now: 'bg-brand-sage text-[oklch(0.22_0.025_350)]',
    available_soon: 'bg-brand-butter text-[oklch(0.22_0.025_350)]',
    busy: 'bg-muted-foreground text-background',
  },
  // `bg-current` hereda el color del texto de cada variante: en `subtle`
  // es el foreground del estado y en `solid` el plum oscuro fijo.
  dotColor: {
    available_now: 'bg-current',
    available_soon: 'bg-current',
    busy: 'bg-current',
  },
} as const;
