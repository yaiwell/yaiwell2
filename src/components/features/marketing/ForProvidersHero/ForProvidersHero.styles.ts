/**
 * Estilos del componente ForProvidersHero.
 *
 * Decisiones visuales:
 *  - Fondo decorativo en gradiente brand-peach-soft → brand-rose-soft (estos
 *    tokens YA están definidos en light y dark, así que el degradado
 *    funciona en ambos modos sin tocar globals.css).
 *  - Tipografía editorial Fraunces vía heredada del layout (h1 toma
 *    `font-display` desde globals.css).
 *  - Mockup decorativo a la derecha (md+) en su propia card glass-like:
 *    no es una imagen, es un placeholder visual con datos i18n para
 *    transmitir el producto sin necesidad de screenshots reales.
 *  - Todo con semantic tokens: `bg-background`, `text-foreground`,
 *    `bg-card`, `border-border`, `text-primary`... cero colores Tailwind
 *    crudos. Esto garantiza paridad light/dark desde el primer commit.
 */
export const forProvidersHeroStyles = {
  root: 'relative isolate overflow-hidden bg-background px-6 pt-16 pb-20 md:px-10 md:pt-24 md:pb-28',
  // Fondo cálido con gradiente brand. En dark los tokens `*-soft` viran a
  // plums oscuros automáticamente (definidos en .dark del globals.css).
  bgLayer:
    'pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-peach-soft via-brand-rose-soft to-brand-lilac-soft opacity-90',
  // Halo radial sutil para dar foco al contenido sin romper la calidez.
  bgGlow:
    'pointer-events-none absolute -top-1/3 left-1/2 -z-10 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,var(--brand-peach-soft),transparent_60%)] opacity-60',
  container:
    'mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16',

  // === Columna textual ===
  textCol: 'flex flex-col items-start gap-6 text-left',
  eyebrow:
    'inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur',
  eyebrowDot: 'inline-block size-1.5 rounded-full bg-primary',
  title:
    'text-balance text-4xl leading-[1.05] font-medium tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[4.25rem]',
  titleAccent:
    'block bg-gradient-to-r from-brand-rose to-brand-peach bg-clip-text font-display italic font-normal text-transparent',
  subtitle:
    'max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl',
  ctaGroup: 'mt-2 flex flex-col gap-3 sm:flex-row sm:items-center',
  ctaPrimary:
    'inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-150 hover:bg-primary/90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] md:h-14 md:px-8 md:text-base',
  ctaSecondary:
    'inline-flex h-12 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-6 text-sm font-medium text-foreground transition-all duration-150 hover:bg-muted hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] md:h-14 md:px-8 md:text-base',
  trustNote: 'text-xs text-muted-foreground sm:text-sm',

  // === Mockup decorativo ===
  // Card "screenshot" del panel del proveedor: composición visual sin
  // datos reales. Pensada para ser legible en light y dark con tokens.
  mockCol: 'relative flex w-full items-center justify-center',
  mockFrame:
    'relative w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/5 md:p-6',
  mockBadge:
    'inline-flex items-center gap-2 rounded-full bg-brand-sage-soft px-3 py-1 text-xs font-medium text-brand-sage',
  mockBadgeDot: 'size-1.5 animate-pulse rounded-full bg-brand-sage',
  mockBookingRow:
    'mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-4',
  mockBookingLeft: 'flex min-w-0 items-center gap-3',
  mockAvatar:
    'flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-rose-soft text-brand-rose',
  mockBookingTexts: 'flex min-w-0 flex-col gap-0.5',
  mockBookingService: 'truncate text-sm font-medium text-foreground',
  mockBookingClient: 'truncate text-xs text-muted-foreground',
  mockBookingStatus:
    'shrink-0 rounded-full bg-brand-sage-soft px-2.5 py-1 text-[11px] font-medium text-brand-sage',
  mockMetricRow:
    'mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-4',
  mockMetricLabel: 'text-xs text-muted-foreground',
  mockMetricValue: 'text-2xl font-medium tracking-tight text-foreground',
  mockBarTrack: 'mt-3 h-2 w-full overflow-hidden rounded-full bg-muted',
  mockBarFill: 'h-full w-[86%] rounded-full bg-gradient-to-r from-brand-rose to-brand-peach',
  // Burbuja decorativa flotante para dar profundidad al mock.
  mockFloat:
    'absolute -right-4 -top-4 hidden size-20 rounded-full bg-brand-butter-soft md:block',
  mockFloat2:
    'absolute -bottom-6 -left-6 hidden size-28 rounded-full bg-brand-lilac-soft md:block',
} as const;
