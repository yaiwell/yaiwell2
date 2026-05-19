/**
 * Estilos del componente HowItWorks.
 *
 * Tres columnas en desktop con numeración grande tipo editorial. En mobile
 * se apila vertical. Cada paso lleva un tono pastel propio en el icono
 * para que la sección no resulte monocromo.
 */
export const howItWorksStyles = {
  root: 'bg-gradient-to-b from-background to-brand-rose-soft/40 py-16 md:py-24',
  container: 'mx-auto max-w-6xl px-6 md:px-8',
  header: 'mb-10 flex flex-col items-center gap-3 text-center md:mb-14',
  title: 'text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl',
  grid: 'grid gap-6 md:grid-cols-3 md:gap-8',
  step: 'group relative flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md md:p-8',
  stepIndex:
    'absolute right-5 top-5 font-display text-3xl italic text-muted-foreground/40 md:text-4xl',
  stepTitle: 'text-xl font-medium tracking-tight text-foreground',
  stepDescription: 'text-sm leading-relaxed text-muted-foreground md:text-base',
} as const;

/**
 * Tonos pastel rotados entre los 3 pasos. Mantener separado del array de
 * pasos (que vive en HowItWorks.tsx) para poder ajustar la paleta sin
 * tocar el componente.
 */
export const howItWorksToneStyles = [
  'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-rose-soft text-brand-rose',
  'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sky-soft text-brand-sky',
  'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-peach-soft text-brand-peach',
] as const;
