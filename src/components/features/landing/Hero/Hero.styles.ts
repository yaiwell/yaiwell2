/**
 * Estilos del componente Hero.
 *
 * Mobile-first: imagen de fondo a viewport completo con overlay cálido y
 * tipografía grande. En desktop la altura baja a ~80vh para dejar respirar
 * la siguiente sección sin obligar al scroll.
 */
export const heroStyles = {
  root: 'relative isolate flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-6 pt-12 pb-16 md:min-h-[80vh] md:px-10 md:pt-20 md:pb-24',
  // Capa de fondo con la foto Unsplash. Usamos background-image en CSS
  // inline (vía style) para no añadir hostnames al next.config y para no
  // depender de next/image en una imagen 100% decorativa.
  bgLayer: 'absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat',
  // Overlay editorial: tinte plum oscuro arriba que funde en un blush rosa
  // cálido abajo. Da personalidad cromática a la foto sin matarla.
  overlay:
    'absolute inset-0 -z-10 bg-gradient-to-b from-[oklch(0.22_0.05_350/0.65)] via-[oklch(0.4_0.06_340/0.35)] to-[oklch(0.95_0.04_15/0.95)]',
  content:
    'relative flex w-full max-w-3xl flex-col items-center gap-6 text-center text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)] md:gap-8',
  titleLine1:
    'text-balance text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl md:text-6xl lg:text-7xl',
  titleLine2:
    'mt-1 block bg-gradient-to-r from-[oklch(0.92_0.08_15)] via-[oklch(0.95_0.05_50)] to-[oklch(0.9_0.08_230)] bg-clip-text font-display italic font-normal text-transparent',
  subtitle: 'max-w-2xl text-balance text-base leading-relaxed text-white/95 sm:text-lg md:text-xl',
  searchCard:
    'mt-2 w-full max-w-3xl rounded-3xl border border-white/40 bg-white/95 p-3 text-foreground shadow-2xl shadow-black/10 backdrop-blur md:rounded-full md:p-2',
  searchForm: 'grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center md:gap-0',
  field:
    'flex flex-col gap-0.5 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-muted/60 md:rounded-full md:px-6',
  fieldLabel: 'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
  fieldControl:
    'w-full border-0 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/70 focus:ring-0',
  fieldDivider: 'hidden h-8 w-px self-center bg-border md:block',
  submitWrap: 'flex md:px-1',
  submit:
    'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:h-14 md:w-auto md:rounded-full md:px-8',
  // Píldora discreta "Ahora · disponible" para enfatizar el diferencial
  // de disponibilidad inmediata por encima del título.
  badge:
    'inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur',
  badgeDot: 'h-1.5 w-1.5 rounded-full bg-brand-sage animate-pulse',
} as const;
