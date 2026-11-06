/**
 * Estilos del componente Footer.
 *
 * En mobile añadimos padding inferior extra para no quedar tapado por el
 * bottom tab bar (MobileNav). En desktop el padding vuelve a la normalidad
 * porque el MobileNav se oculta.
 */
export const footerStyles = {
  root: 'border-t border-border bg-muted/40 pb-28 md:pb-0',
  container: 'mx-auto max-w-7xl px-6 py-10 md:py-12',
  // Marca + dos columnas de enlaces. En móvil la marca ocupa todo el ancho y
  // las columnas van lado a lado; en escritorio todo en una fila, con la marca
  // a la izquierda y los enlaces a la derecha. Antes había dos pistas para tres
  // hijos y «Legal» caía a una segunda fila bajo la marca.
  top: 'grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-x-16 lg:gap-x-24',
  brandCol: 'col-span-2 flex flex-col items-start gap-3 md:col-span-1',
  brand: 'flex items-center gap-2 text-foreground',
  // Misma marca que la cabecera.
  brandMark:
    'inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-rose to-brand-peach text-foreground shadow-sm ring-1 ring-foreground/15 dark:from-brand-rose-soft dark:to-brand-peach-soft dark:ring-foreground/25',
  brandText: 'font-display text-xl tracking-tight',
  tagline: 'max-w-xs text-sm leading-relaxed text-muted-foreground',
  contactLink:
    'mt-1 inline-flex min-h-9 items-center gap-2 rounded-full border border-border px-3.5 text-sm text-muted-foreground transition-colors duration-150 hover:border-foreground/30 hover:text-foreground focus-visible:border-foreground/30 focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  group: 'flex flex-col gap-3',
  groupTitle: 'text-sm font-semibold tracking-tight text-foreground',
  groupList: 'flex flex-col gap-2 text-sm',
  // Los enlaces del footer son inline: usamos un rounded-sm pequeño para
  // que el ring no quede excesivo alrededor de la línea de texto.
  groupLink:
    'rounded-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  bottom:
    'mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center',
} as const;
