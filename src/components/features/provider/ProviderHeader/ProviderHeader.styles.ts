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
  // Padding superior reducido para que el breadcrumb no quede tan
  // pegado al header de la app; padding inferior amplio para respirar
  // antes de la galería.
  root: 'flex w-full flex-col gap-5 pt-4 pb-2 md:gap-7 md:pt-6 md:pb-4',

  // Breadcrumb
  breadcrumb: 'flex items-center gap-1.5 text-xs text-muted-foreground',
  breadcrumbList: 'flex flex-wrap items-center gap-1.5',
  breadcrumbItem: 'inline-flex items-center',
  breadcrumbLink: 'transition-colors hover:text-foreground hover:underline',
  breadcrumbSeparator: 'text-border',
  breadcrumbCurrent: 'text-foreground/80',

  // Layout principal del header. En móvil se apila siempre (izquierda
  // arriba, derecha abajo). En desktop pasa a dos columnas alineadas
  // arriba para que el rating no flote en medio del bloque.
  headerRow: 'flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-8',

  // Columna izquierda: tipo, nombre, dirección. Aumentamos el gap
  // entre el tipo (eyebrow) y el nombre para que el h1 respire.
  leftCol: 'flex flex-col gap-2.5',
  type: 'text-xs uppercase tracking-wide text-muted-foreground',
  name: 'font-display text-3xl leading-tight tracking-tight text-foreground md:text-4xl',
  address: 'text-sm text-muted-foreground',

  // Columna derecha: en móvil apilada y alineada a la izquierda para
  // mantener el flow lectura natural; en desktop alineada a la derecha.
  rightCol:
    'flex flex-wrap items-center gap-x-3 gap-y-2 md:flex-col md:flex-nowrap md:items-end md:gap-3',
  availabilityWrapper: 'inline-flex',
  priceRange:
    'inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground',
  ratingRow: 'inline-flex items-center gap-2',
  rating: 'inline-flex items-center gap-1 text-base font-semibold text-foreground',
  ratingStar: 'size-4 fill-amber-500 stroke-amber-500',
  reviews: 'text-xs text-muted-foreground',
} as const;
