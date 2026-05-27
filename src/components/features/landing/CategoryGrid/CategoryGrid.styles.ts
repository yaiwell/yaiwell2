import type { CategoryTone } from './CategoryGrid.types';

/**
 * Estilos del componente CategoryGrid.
 *
 * Patrón visual:
 * - Card vertical: foto en la mitad superior + bloque pastel inferior con
 *   icono y nombre **siempre visibles**. Le da vida sin ocultar el texto.
 * - Mobile: grid 2 columnas. Desktop: 4 columnas.
 * - Hover: lift sutil + zoom muy ligero en la foto, sin tocar el texto.
 */
export const categoryGridStyles = {
  root: 'bg-background py-16 md:py-24',
  container: 'mx-auto max-w-7xl px-6 md:px-8',
  header: 'mb-8 flex flex-col gap-2 md:mb-12',
  title: 'text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl',
  subtitle: 'max-w-xl text-sm text-muted-foreground md:text-base',
  grid: 'grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5',
  // Microinteracciones: además del lift en hover, añadimos focus-visible
  // para teclado y un pequeño `active:scale` para feedback de tap mobile.
  card: 'group relative flex aspect-[4/5] flex-col overflow-hidden rounded-3xl shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
  imageWrap: 'relative h-3/5 overflow-hidden',
  image:
    'absolute inset-0 h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.06]',
  imageTint: 'absolute inset-0 mix-blend-multiply opacity-30',
  arrowWrap:
    'absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
  pastelBlock: 'relative flex h-2/5 items-center gap-3 px-4 py-3 md:px-5 md:py-4',
  iconWrap:
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm md:h-11 md:w-11',
  title2: 'text-sm font-medium leading-tight md:text-base lg:text-lg',
} as const;

/**
 * Mapeo de tono pastel a clases Tailwind concretas.
 * Mantener aquí (no inline) para que los tonos sean fácilmente auditables
 * y reutilizables desde otros componentes (filtros, fichas, etc.).
 */
export const categoryToneStyles: Record<
  CategoryTone,
  { pastel: string; tint: string; icon: string; title: string }
> = {
  rose: {
    pastel: 'bg-brand-rose-soft',
    tint: 'bg-brand-rose-soft',
    icon: 'text-brand-rose',
    title: 'text-[oklch(0.32_0.07_350)]',
  },
  sky: {
    pastel: 'bg-brand-sky-soft',
    tint: 'bg-brand-sky-soft',
    icon: 'text-brand-sky',
    title: 'text-[oklch(0.3_0.08_230)]',
  },
  peach: {
    pastel: 'bg-brand-peach-soft',
    tint: 'bg-brand-peach-soft',
    icon: 'text-brand-peach',
    title: 'text-[oklch(0.34_0.08_50)]',
  },
  sage: {
    pastel: 'bg-brand-sage-soft',
    tint: 'bg-brand-sage-soft',
    icon: 'text-brand-sage',
    title: 'text-[oklch(0.32_0.06_145)]',
  },
  butter: {
    pastel: 'bg-brand-butter-soft',
    tint: 'bg-brand-butter-soft',
    icon: 'text-brand-butter',
    title: 'text-[oklch(0.34_0.07_90)]',
  },
  lilac: {
    pastel: 'bg-brand-lilac-soft',
    tint: 'bg-brand-lilac-soft',
    icon: 'text-brand-lilac',
    title: 'text-[oklch(0.32_0.08_300)]',
  },
};
