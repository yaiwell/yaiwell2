/**
 * Estilos del componente FinalCTA.
 *
 * Banner cálido full-width: degradado rosa pastel → melocotón → celeste
 * pastel. Da cierre alegre a la landing sin gritar.
 */
export const finalCtaStyles = {
  root: 'bg-background pb-16 md:pb-24',
  container: 'mx-auto max-w-7xl px-4 md:px-8',
  // Banner gradient. En light: pasteles claros brillantes. En dark los
  // `*-soft` son tintes oscuros muddy; cambiamos a los `*` claros al 20%
  // para mantener el cierre alegre sin que el banner se confunda con el
  // background dark.
  banner:
    'relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-rose-soft via-brand-peach-soft to-brand-sky-soft dark:from-brand-rose/[0.20] dark:via-brand-peach/[0.20] dark:to-brand-sky/[0.20] px-6 py-14 text-center md:rounded-[2.5rem] md:px-12 md:py-20',
  title:
    'max-w-2xl text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl',
  subtitle: 'max-w-xl text-balance text-base text-muted-foreground md:text-lg',
  // CTA principal: añadimos focus-visible (teclado) y active:scale como
  // feedback de tap. La duración se mantiene corta para no romper la
  // sensación premium.
  button:
    'inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:bg-primary/90 hover:shadow-md focus-visible:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] md:h-14 md:px-10 md:text-base',
} as const;
