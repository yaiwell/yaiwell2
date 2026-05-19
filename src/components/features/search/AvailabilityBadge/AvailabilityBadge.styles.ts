/**
 * Estilos del badge de disponibilidad.
 *
 * Mantenemos dos variantes:
 *  - `subtle`: fondo translúcido sobre fotos o cards claras.
 *  - `solid`: fondo plano, contraste fuerte para usar en CTA o mapa.
 *
 * Colores:
 *  - now   → verde apagado coherente con la paleta stone.
 *  - soon  → ámbar cálido.
 *  - busy  → gris neutro.
 */
export const availabilityBadgeStyles = {
  base: 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none transition-colors',
  dot: 'inline-block size-1.5 rounded-full',
  subtle: {
    available_now: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/70',
    available_soon: 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200/70',
    busy: 'bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-200',
  },
  solid: {
    available_now: 'bg-emerald-600 text-white',
    available_soon: 'bg-amber-500 text-white',
    busy: 'bg-stone-400 text-white',
  },
  dotColor: {
    available_now: 'bg-emerald-500',
    available_soon: 'bg-amber-500',
    busy: 'bg-stone-400',
  },
} as const;
