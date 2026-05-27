/**
 * Estilos del componente NotFoundView.
 *
 * Página editorial centrada con un gradiente cálido suave de marca
 * (peach → rose) y composición vertical mobile-first. El gradiente
 * vive dentro de un contenedor con `rounded-3xl` para evocar las
 * cards del resto del marketplace y no parecer un error frío.
 */
export const notFoundViewStyles = {
  // Contenedor raíz que ocupa todo el alto restante (el layout reserva
  // espacio para Header y Footer, aquí estiramos para centrar el bloque).
  root: 'mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-12 md:px-8 md:py-20',

  // Tarjeta principal con el gradiente. En mobile ocupa el ancho útil,
  // en desktop se limita a 3xl para mantener legibilidad del copy.
  card: 'relative flex w-full max-w-3xl flex-col items-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-peach-soft via-brand-rose-soft to-brand-sky-soft px-6 py-14 text-center md:gap-8 md:rounded-[2.5rem] md:px-12 md:py-20',

  // Ilustración minimalista: emoji grande dentro de un círculo blanco
  // semitransparente. Suficiente para dar foco visual sin SVG dedicado.
  illustration:
    'inline-flex size-20 items-center justify-center rounded-full bg-background/70 text-4xl shadow-sm backdrop-blur md:size-24 md:text-5xl',

  // Eyebrow pequeño con el código 404, en mayúsculas y muy discreto.
  eyebrow:
    'inline-flex items-center rounded-full bg-background/60 px-3 py-1 text-xs font-medium uppercase tracking-wider text-foreground/70',

  // Tipografía display para el título — coherente con el resto de la app.
  title:
    'max-w-2xl text-balance font-display text-3xl font-medium leading-tight tracking-tight text-foreground md:text-5xl',

  subtitle: 'max-w-xl text-balance text-base text-muted-foreground md:text-lg',

  // Fila de CTAs apilada en mobile y horizontal en desktop.
  actions: 'flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center',

  primaryCta:
    'inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:h-13 md:text-base',

  secondaryCta:
    'inline-flex h-12 items-center justify-center rounded-full border border-foreground/15 bg-background/70 px-7 text-sm font-semibold text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 md:h-13 md:text-base',

  helpHint: 'mt-2 max-w-md text-balance text-xs text-muted-foreground md:text-sm',
} as const;
