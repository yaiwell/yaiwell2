/**
 * Estilos del componente Footer.
 *
 * En mobile añadimos padding inferior extra para no quedar tapado por el
 * bottom tab bar (MobileNav). En desktop el padding vuelve a la normalidad
 * porque el MobileNav se oculta.
 */
export const footerStyles = {
  root: 'border-t border-border bg-muted/40 pb-28 md:pb-0',
  container: 'mx-auto max-w-7xl px-6 py-12 md:py-16',
  top: 'grid gap-10 md:grid-cols-[1.2fr_repeat(3,1fr)]',
  brandCol: 'flex flex-col gap-3',
  brand: 'flex items-center gap-2 text-base font-semibold tracking-tight text-foreground',
  brandMark:
    'inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background',
  tagline: 'max-w-xs text-sm leading-relaxed text-muted-foreground',
  socials: 'mt-2 flex items-center gap-2',
  socialButton:
    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-150 hover:border-foreground/30 hover:text-foreground focus-visible:border-foreground/30 focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95',
  group: 'flex flex-col gap-3',
  groupTitle: 'text-sm font-semibold tracking-tight text-foreground',
  groupList: 'flex flex-col gap-2 text-sm',
  // Los enlaces del footer son inline: usamos un rounded-sm pequeño para
  // que el ring no quede excesivo alrededor de la línea de texto.
  groupLink:
    'rounded-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  bottom:
    'mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center',
} as const;
