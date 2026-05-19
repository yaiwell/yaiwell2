/**
 * Estilos del componente FinalCTA.
 *
 * Banner cálido full-width: degradado rosa pastel → melocotón → celeste
 * pastel. Da cierre alegre a la landing sin gritar.
 */
export const finalCtaStyles = {
  root: 'bg-background pb-16 md:pb-24',
  container: 'mx-auto max-w-7xl px-4 md:px-8',
  banner:
    'relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-rose-soft via-brand-peach-soft to-brand-sky-soft px-6 py-14 text-center md:rounded-[2.5rem] md:px-12 md:py-20',
  title:
    'max-w-2xl text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl',
  subtitle: 'max-w-xl text-balance text-base text-muted-foreground md:text-lg',
  button:
    'inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:h-14 md:px-10 md:text-base',
} as const;
