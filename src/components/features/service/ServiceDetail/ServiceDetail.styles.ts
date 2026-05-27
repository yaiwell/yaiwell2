/**
 * Estilos del componente ServiceDetail.
 *
 * Composición mobile-first con dos columnas en desktop: contenido
 * principal a la izquierda (descripción, política) y panel pegado a
 * la derecha con CTA + meta del servicio. En móvil el panel pasa a
 * ser un sticky inferior (lo gestiona el contenedor `mainColRight`).
 */
export const serviceDetailStyles = {
  // Raíz: ancho con max-w y padding lateral coherentes con la ficha
  // del proveedor para que la transición visual entre ambas sea suave.
  root: 'mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-4 pb-12 md:gap-12 md:px-8 md:pt-6 md:pb-20',

  // Breadcrumb idéntico al de ProviderHeader para mantener consistencia
  // de marca; reutilizamos tokens semánticos del tema.
  breadcrumb: 'flex items-center gap-1.5 text-xs text-muted-foreground',
  breadcrumbList: 'flex flex-wrap items-center gap-1.5',
  breadcrumbItem: 'inline-flex items-center',
  breadcrumbLink: 'transition-colors hover:text-foreground hover:underline',
  breadcrumbSeparator: 'text-border ms-1.5',
  breadcrumbCurrent: 'text-foreground/80',

  // Cabecera del servicio: eyebrow + título display + nombre del centro.
  header: 'flex flex-col gap-3',
  eyebrow: 'text-xs uppercase tracking-wide text-muted-foreground',
  title: 'font-display text-3xl leading-tight tracking-tight text-foreground md:text-4xl',
  providerLine: 'text-sm text-muted-foreground',
  providerLink: 'font-medium text-foreground/80 transition-colors hover:underline',

  // Layout principal: en móvil pila vertical, en desktop 2 columnas
  // con la derecha más estrecha (panel sticky).
  body: 'grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_320px] md:gap-10 lg:grid-cols-[minmax(0,1fr)_360px]',
  mainCol: 'flex flex-col gap-8',

  // Bloque de profesional asignado: tarjeta cálida con foto + datos.
  professionalCard:
    'flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5',
  professionalAvatar:
    'size-14 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border md:size-16',
  // El `<img>` interno ocupa el círculo con object-cover para no deformarse.
  professionalAvatarImg: 'h-full w-full object-cover',
  professionalAvatarFallback:
    'flex h-full w-full items-center justify-center bg-brand-peach-soft text-lg font-semibold text-foreground/70',
  professionalInfo: 'flex flex-col gap-0.5',
  professionalLabel: 'text-xs uppercase tracking-wide text-muted-foreground',
  professionalName: 'font-display text-lg text-foreground md:text-xl',
  professionalRole: 'text-sm text-muted-foreground',

  // Sección de descripción.
  section: 'flex flex-col gap-3',
  sectionTitle: 'font-display text-2xl text-foreground md:text-3xl',
  descriptionText: 'text-base leading-relaxed text-foreground/80',

  // Sección de política: lista de tres items.
  policyList: 'flex flex-col gap-3',
  policyItem:
    'flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5',
  policyIconWrapper:
    'flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-sage-soft text-foreground/80',
  policyIcon: 'size-4',
  policyBody: 'flex flex-col gap-1',
  policyItemTitle: 'text-sm font-semibold text-foreground',
  policyItemText: 'text-sm text-muted-foreground',
  policyRatingHint:
    'rounded-2xl bg-brand-butter-soft px-4 py-3 text-xs italic text-foreground/70 md:text-sm',

  // Panel lateral con CTA: en mobile no es sticky (cae al final del flow);
  // en desktop se pega al top con offset que esquiva el header sticky.
  asideCol: 'flex flex-col',
  asideCard:
    'flex flex-col gap-5 rounded-3xl border border-border bg-card p-5 shadow-sm md:sticky md:top-24 md:p-6',
  asideMetaRow: 'flex items-center justify-between gap-3',
  asideMetaItem: 'flex flex-col gap-0.5',
  asideMetaLabel: 'text-xs uppercase tracking-wide text-muted-foreground',
  asideMetaValue: 'font-display text-xl text-foreground md:text-2xl',
  asidePriceValue: 'font-display text-2xl text-foreground md:text-3xl',
  asideDivider: 'h-px w-full bg-border',
  reserveCta:
    'inline-flex h-13 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:text-base',
  reserveNote: 'text-center text-xs text-muted-foreground',
} as const;
