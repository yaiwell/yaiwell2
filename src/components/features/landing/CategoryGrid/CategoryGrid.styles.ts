import type { CategoryTone } from './CategoryGrid.types';

/**
 * Estilos del componente CategoryGrid.
 *
 * Patrón visual:
 * - Cards pastel sólidas, icono y nombre siempre visibles (sin truco hover).
 * - Mobile: grid 2 columnas que aprovechan el ancho. Mucho más legible que
 *   un scroll horizontal donde el usuario perdía la mitad de las opciones.
 * - Desktop: grid 4 columnas. Hover sutil (lift + sombra), no tapa info.
 */
export const categoryGridStyles = {
  root: 'bg-background py-16 md:py-24',
  container: 'mx-auto max-w-7xl px-6 md:px-8',
  header: 'mb-8 flex flex-col gap-2 md:mb-12',
  title: 'text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl',
  subtitle: 'max-w-xl text-sm text-muted-foreground md:text-base',
  grid: 'grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5',
  card: 'group relative flex aspect-square flex-col items-start justify-between overflow-hidden rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg md:p-6',
  iconWrap:
    'inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm transition-transform duration-300 group-hover:scale-105 md:h-12 md:w-12',
  title2: 'text-base font-medium leading-tight md:text-lg',
  arrowWrap:
    'absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100',
} as const;

/**
 * Mapeo de tono pastel a clases Tailwind concretas.
 * Mantener aquí (no inline) para que los tonos sean fácilmente auditables
 * y reutilizables desde otros componentes (filtros, fichas, etc.).
 */
export const categoryToneStyles: Record<
  CategoryTone,
  { card: string; icon: string; title: string }
> = {
  rose: {
    card: 'bg-brand-rose-soft',
    icon: 'text-brand-rose',
    title: 'text-[oklch(0.32_0.07_350)]',
  },
  sky: {
    card: 'bg-brand-sky-soft',
    icon: 'text-brand-sky',
    title: 'text-[oklch(0.3_0.08_230)]',
  },
  peach: {
    card: 'bg-brand-peach-soft',
    icon: 'text-brand-peach',
    title: 'text-[oklch(0.34_0.08_50)]',
  },
  sage: {
    card: 'bg-brand-sage-soft',
    icon: 'text-brand-sage',
    title: 'text-[oklch(0.32_0.06_145)]',
  },
  butter: {
    card: 'bg-brand-butter-soft',
    icon: 'text-brand-butter',
    title: 'text-[oklch(0.34_0.07_90)]',
  },
  lilac: {
    card: 'bg-brand-lilac-soft',
    icon: 'text-brand-lilac',
    title: 'text-[oklch(0.32_0.08_300)]',
  },
};
