/**
 * Estilos del componente FinalCTA.
 *
 * Banner cálido full-width, fondo en degradado stone con un toque de
 * ámbar muy puntual para hacer el "empujón" sin romper la paleta.
 */
export const finalCtaStyles = {
  root: 'bg-background pb-16 md:pb-24',
  container: 'mx-auto max-w-7xl px-4 md:px-8',
  banner:
    'relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-stone-100 via-stone-50 to-amber-50 px-6 py-14 text-center md:rounded-[2.5rem] md:px-12 md:py-20',
  title:
    'max-w-2xl text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-5xl',
  subtitle: 'max-w-xl text-balance text-base text-muted-foreground md:text-lg',
  button:
    'inline-flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 md:h-14 md:px-10 md:text-base',
} as const;
