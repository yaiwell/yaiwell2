import { cva } from 'class-variance-authority';

/**
 * Estilos de RatingSummary.
 *
 * Las tres variantes replican la escala que tenía cada sitio antes de
 * extraer el componente (cabecera de ficha, card de listado y popup del
 * mapa), así que no cambia el aspecto de los centros con reseñas.
 *
 * La etiqueta «Nuevo en Yaiwell» es deliberadamente discreta: borde fino
 * y texto `muted`, sin color de marca. Informa sin competir con la
 * disponibilidad, que es el dato protagonista de la card.
 */
export const ratingSummaryRoot = cva('inline-flex items-center', {
  variants: {
    variant: {
      header: 'gap-2',
      card: 'gap-1.5 text-sm',
      popup: 'gap-1.5 text-xs',
    },
  },
  defaultVariants: { variant: 'card' },
});

export const ratingSummaryValue = cva('inline-flex items-center gap-1', {
  variants: {
    variant: {
      header: 'text-base font-semibold text-foreground',
      card: 'font-medium',
      popup: 'font-medium text-foreground',
    },
  },
  defaultVariants: { variant: 'card' },
});

// Estrella en el ocre de `status-soon-foreground`: misma familia cálida
// que el `brand-butter` de antes, pero con contraste ≥ 3:1 sobre card en
// ambos modos (el butter puro se quedaba en ~1,5:1 en claro; auditoría de
// diseño 2026-10-27). La cifra va en `foreground`, nunca en color de marca.
const STAR_COLOR = 'fill-status-soon-foreground stroke-status-soon-foreground';

export const ratingSummaryStar = cva(STAR_COLOR, {
  variants: {
    variant: {
      header: 'size-4',
      card: 'size-3.5',
      popup: 'size-3.5',
    },
  },
  defaultVariants: { variant: 'card' },
});

export const ratingSummaryCount = cva('text-muted-foreground', {
  variants: {
    variant: {
      header: 'text-xs',
      card: '',
      popup: '',
    },
  },
  defaultVariants: { variant: 'card' },
});

export const ratingSummaryNewBadge = cva(
  'inline-flex items-center rounded-full border border-border font-medium whitespace-nowrap text-muted-foreground',
  {
    variants: {
      variant: {
        header: 'px-2.5 py-0.5 text-xs',
        card: 'px-2 py-0.5 text-xs',
        popup: 'px-1.5 py-px text-[11px]',
      },
    },
    defaultVariants: { variant: 'card' },
  },
);

/** Separador «·» entre nota y contador; solo lo usa el popup. */
export const ratingSummarySeparator = 'text-muted-foreground/60';
