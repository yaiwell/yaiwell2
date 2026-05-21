/**
 * Estilos de `ProviderHeader`.
 *
 * Cabecera editorial de la ficha de proveedor: breadcrumb pequeño,
 * título grande en tipografía display y bloque derecho con disponibilidad,
 * precio y rating. Mobile-first: en móvil se apila, en desktop se
 * reparte en dos columnas.
 *
 * Tokens semánticos (`text-foreground`, `text-muted-foreground`,
 * `bg-muted`, `border-border`) para mantener coherencia con el resto
 * del marketplace y soportar modo oscuro sin retocar nada.
 */
export const providerHeaderStyles = {
  root: 'flex w-full flex-col gap-6 py-6 md:py-10',

  // Breadcrumb
  breadcrumb: 'flex items-center gap-1.5 text-xs text-muted-foreground',
  breadcrumbList: 'flex flex-wrap items-center gap-1.5',
  breadcrumbItem: 'inline-flex items-center',
  breadcrumbLink: 'transition-colors hover:text-foreground hover:underline',
  breadcrumbSeparator: 'text-border',
  breadcrumbCurrent: 'text-foreground/80',

  // Layout principal del header (dos columnas en desktop)
  headerRow: 'flex flex-col gap-6 md:flex-row md:items-start md:justify-between',

  // Columna izquierda: tipo, nombre, dirección
  leftCol: 'flex flex-col gap-2',
  type: 'text-xs uppercase tracking-wide text-muted-foreground',
  name: 'font-display text-3xl tracking-tight text-foreground md:text-4xl',
  address: 'inline-flex items-center gap-1.5 text-sm text-muted-foreground',
  addressIcon: 'size-3.5 shrink-0',

  // Columna derecha: badge, precio, rating
  rightCol: 'flex flex-col items-start gap-3 md:items-end md:gap-4',
  availabilityWrapper: 'inline-flex',
  priceRange:
    'inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground',
  ratingRow: 'inline-flex items-center gap-2',
  rating: 'inline-flex items-center gap-1 text-base font-semibold text-foreground',
  ratingStar: 'size-4 fill-amber-500 stroke-amber-500',
  reviews: 'text-xs text-muted-foreground',
} as const;
