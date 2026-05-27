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
  solid: {
    available_now: 'bg-brand-sage text-primary-foreground',
    available_soon: 'bg-brand-butter text-primary-foreground',
    busy: 'bg-muted-foreground text-background',
  },
  dotColor: {
    available_now: 'bg-brand-sage',
    available_soon: 'bg-brand-butter',
    busy: 'bg-muted-foreground',
  },
} as const;
