/**
 * Estilos del componente DifferentiatorCards.
 *
 * Tres tarjetas grandes en desktop, apiladas en mobile. Cada card lleva un
 * tono pastel propio en el icono para coordinarse con la paleta de marca.
 */
export const differentiatorCardsStyles = {
  root: 'bg-background py-16 md:py-24',
  container: 'mx-auto max-w-6xl px-6 md:px-8',
  header: 'mb-10 flex flex-col items-center gap-3 text-center md:mb-14',
  title: 'text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl',
  grid: 'grid gap-4 md:grid-cols-3 md:gap-6',
  card: 'flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md md:p-8',
  cardTitle: 'text-xl font-medium tracking-tight text-foreground',
  cardBody: 'text-sm leading-relaxed text-muted-foreground md:text-base',
} as const;

/**
 * Tonos pastel rotados entre las 3 cards de diferenciación.
 */
export const differentiatorToneStyles = [
  'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sage-soft text-brand-sage',
  'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-rose-soft text-brand-rose',
  'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sky-soft text-brand-sky',
] as const;
