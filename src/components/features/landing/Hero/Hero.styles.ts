/**
 * Estilos del componente Hero.
 *
 * Mobile-first: imagen de fondo a viewport completo con overlay cálido y
 * tipografía grande. En desktop la altura baja a ~80vh para dejar respirar
 * la siguiente sección sin obligar al scroll.
 *
 * Search form (rediseño 2026-05-19): en desktop se renderiza como una
 * píldora limpia con 3 campos divididos por separadores verticales y un
 * botón circular de búsqueda a la derecha (lenguaje Airbnb/Booking).
 * Cada campo combina icono + label superior pequeña + valor abajo, con
 * hover sutil sobre el segmento completo.
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

  // === Search card ===
  // Mobile: card vertical con campos apilados y separadores horizontales.
  // Desktop: píldora limpia con campos en fila y separadores verticales.
  searchCard:
    'mt-2 w-full max-w-3xl rounded-3xl bg-white text-foreground shadow-2xl shadow-black/15 ring-1 ring-black/5 backdrop-blur md:rounded-full md:p-1.5',
  searchForm: 'flex flex-col divide-y divide-border md:flex-row md:items-stretch md:divide-y-0',

  // Cada campo es un label que abarca todo su segmento clickable.
  // En desktop el padding lo da el segmento; el divider va separado.
  field:
    'group/field relative flex flex-1 items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/60 focus-within:bg-muted/60 md:rounded-full md:px-6 md:py-3',
  fieldIcon:
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover/field:bg-white group-hover/field:text-foreground',
  fieldBody: 'flex min-w-0 flex-1 flex-col gap-0.5',
  fieldLabel: 'text-[11px] font-medium uppercase tracking-wider text-muted-foreground',
  fieldControl:
    'w-full appearance-none border-0 bg-transparent pr-6 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/70 focus:ring-0',
  // Trigger del Radix Select usado dentro de un `field`. Hereda el padding
  // y la chevron del wrapper para mantener la línea visual de los inputs.
  selectTrigger:
    'h-auto w-full justify-start gap-0 border-0 bg-transparent p-0 pr-6 text-sm font-medium text-foreground hover:bg-transparent focus:ring-0 data-[placeholder]:text-muted-foreground/70',
  fieldChevron:
    'pointer-events-none absolute right-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-transform group-hover/field:text-foreground md:right-6',

  // Divisor vertical en desktop (solo se ve en md+).
  fieldDivider: 'hidden h-8 w-px self-center bg-border md:block',

  // Botón submit: en mobile ocupa fila completa; en desktop es circular,
  // primario, alineado a la derecha de la píldora.
  submitWrap: 'flex p-2 md:items-center md:p-0',
  submit:
    'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:h-12 md:w-12 md:rounded-full md:px-0',
  submitLabel: 'md:sr-only',
} as const;
