/**
 * Estilos del componente HowItWorks.
 *
 * Tres columnas en desktop con numeración grande tipo editorial. En mobile
 * se apila vertical para que cada paso respire.
 */
export const howItWorksStyles = {
  root: 'bg-muted/40 py-16 md:py-24',
  container: 'mx-auto max-w-6xl px-6 md:px-8',
  header: 'mb-10 flex flex-col items-center gap-3 text-center md:mb-14',
  title: 'text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-5xl',
  grid: 'grid gap-6 md:grid-cols-3 md:gap-8',
  step: 'group relative flex flex-col gap-4 rounded-3xl border border-border bg-background p-6 shadow-sm transition-shadow hover:shadow-md md:p-8',
  stepIndex: 'absolute right-5 top-5 font-serif text-3xl text-muted-foreground/40 md:text-4xl',
  stepIconWrap:
    'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 text-foreground',
  stepTitle: 'text-xl font-semibold tracking-tight text-foreground',
  stepDescription: 'text-sm leading-relaxed text-muted-foreground md:text-base',
} as const;
