/**
 * Estilos del componente ForProvidersBenefits.
 *
 * Grid responsive 1/2/4 columnas. Cada card lleva un badge pastel con
 * el icono Lucide y respeta los semantic tokens para que el dark mode
 * funcione sin cambios. La sutil elevación en hover refuerza la
 * sensación premium sin pasar de la convención del proyecto.
 */
export const forProvidersBenefitsStyles = {
  root: 'bg-background py-16 md:py-24',
  container: 'mx-auto max-w-6xl px-6 md:px-8',
  header: 'mb-10 flex flex-col items-center gap-3 text-center md:mb-14',
  eyebrow:
    'text-xs font-medium uppercase tracking-wider text-muted-foreground md:text-sm',
  title:
    'max-w-3xl text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl',
  subtitle: 'max-w-2xl text-balance text-base text-muted-foreground md:text-lg',
  grid: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6',
  card: 'flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background md:p-7',
  cardTitle: 'text-lg font-medium tracking-tight text-foreground',
  cardBody: 'text-sm leading-relaxed text-muted-foreground',
} as const;

/**
 * Paleta de tonos para el badge del icono. Usa SOLO tokens brand-*
 * (definidos en globals.css en light y dark) para garantizar paridad
 * cromática en ambos modos.
 */
export const forProvidersBenefitsToneStyles = [
  'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sage-soft text-brand-sage',
  'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-rose-soft text-brand-rose',
  'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sky-soft text-brand-sky',
  'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-butter-soft text-brand-butter',
] as const;
