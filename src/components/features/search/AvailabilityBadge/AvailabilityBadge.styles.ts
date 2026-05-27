/**
 * Estilos del badge de disponibilidad.
 *
 * Mantenemos dos variantes:
 *  - `subtle`: fondo translúcido sobre fotos o cards claras.
 *  - `solid`: fondo plano, contraste fuerte para usar en CTA o mapa.
 *
 * Colores funcionales mapeados a tokens de marca para que respeten el
 * modo oscuro (los `*-soft` están redefinidos en `.dark` en globals.css):
 *  - now   → brand-sage (verde de marca).
 *  - soon  → brand-butter (ámbar cálido de marca).
 *  - busy  → neutro semántico.
 */
export const availabilityBadgeStyles = {
  base: 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none transition-colors',
  dot: 'inline-block size-1.5 rounded-full',
  subtle: {
    available_now: 'bg-brand-sage-soft text-brand-sage ring-1 ring-inset ring-brand-sage/30',
    available_soon: 'bg-brand-butter-soft text-brand-butter ring-1 ring-inset ring-brand-butter/30',
    busy: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
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
  dotColor: {
    available_now: 'bg-brand-sage',
    available_soon: 'bg-brand-butter',
    busy: 'bg-muted-foreground',
  },
} as const;
