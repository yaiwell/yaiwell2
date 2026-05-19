/**
 * Estilos del componente DifferentiatorCards.
 *
 * Tres tarjetas grandes en desktop, apiladas en mobile. Reutilizan el
 * mismo lenguaje visual de "rounded-3xl + borde sutil + sombra suave"
 * del resto de la landing para mantener cohesión.
 */
export const differentiatorCardsStyles = {
  root: 'bg-background py-16 md:py-24',
  container: 'mx-auto max-w-6xl px-6 md:px-8',
  header: 'mb-10 flex flex-col items-center gap-3 text-center md:mb-14',
  title: 'text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-5xl',
  grid: 'grid gap-4 md:grid-cols-3 md:gap-6',
  card: 'flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-md md:p-8',
  iconWrap:
    'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 text-foreground',
  cardTitle: 'text-xl font-semibold tracking-tight text-foreground',
  cardBody: 'text-sm leading-relaxed text-muted-foreground md:text-base',
} as const;
