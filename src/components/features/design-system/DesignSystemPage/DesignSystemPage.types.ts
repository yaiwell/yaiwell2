/**
 * Tipos del módulo design-system.
 *
 * Catálogos planos (token + variant name) que la UI usa para renderizar
 * sin hacer asunciones sobre globals.css. Si añadimos un token nuevo,
 * basta con extenderlo aquí.
 */

export interface ColorSwatch {
  /** Identificador de token (clave en globals.css sin guion inicial). */
  token: string;
  /** Clase Tailwind para pintar el swatch (e.g. `bg-primary`). */
  bgClass: string;
  /** Clase Tailwind para texto sobre la superficie (contraste). */
  fgClass: string;
}

export interface BrandPair {
  /** Nombre del color (rose, sky, peach, sage, butter, lilac). */
  name: string;
  /** Clases para la versión saturada (texto/icono). */
  solid: { bgClass: string; fgClass: string };
  /** Clases para la versión soft (fondo de chip/badge). */
  soft: { bgClass: string; fgClass: string };
}

export type ButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'link';

export type ButtonSize = 'xs' | 'sm' | 'default' | 'lg';

export interface RadiusToken {
  /** Nombre técnico (`sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`). */
  name: string;
  /** Clase Tailwind correspondiente (`rounded-sm`, ...). */
  className: string;
}
