/**
 * Estilos del componente Header.
 *
 * Centralizamos las clases Tailwind aquí para mantener el JSX limpio y
 * facilitar futuras variantes (modo oscuro, contraste alto, etc.).
 */
export const headerStyles = {
  root: 'sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70',
  container: 'mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-20 md:px-8',
  // Microinteracciones: focus-visible para teclado en todos los interactivos
  // (link de marca, navegación, botones). `transition-*` con duración corta
  // para mantener la sensación premium sin animaciones lentas.
  brand:
    'flex items-center gap-2 font-medium tracking-tight text-foreground transition-opacity duration-150 hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md',
  // El brandMark vive sobre un gradiente pastel. En light usamos el
  // gradient brand-rose→brand-peach (pastels claros L0.72-0.78) con
  // texto plum oscuro (`text-foreground` L0.22) → contraste ~5:1. En
  // dark los brand-* son pastels MUY claros (L0.85-0.88) y un texto
  // crema sobre ellos sería invisible (~1.1:1); por eso en dark
  // cambiamos el gradient a los `*-soft` (L0.30-0.32) y mantenemos
  // `text-foreground` (crema 0.97) → contraste ~12:1 ✓.
  brandMark:
    'inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-rose to-brand-peach dark:from-brand-rose-soft dark:to-brand-peach-soft text-foreground shadow-sm ring-1 ring-foreground/15 dark:ring-foreground/25',
  brandText: 'font-display text-xl md:text-2xl tracking-tight',
  desktopNav: 'hidden items-center gap-7 md:flex',
  navLink:
    'rounded-md text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  desktopActions: 'hidden items-center gap-2 md:flex',
  desktopProvidersLink:
    'mr-2 hidden rounded-md text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:inline-flex',
  mobileActions: 'flex items-center gap-2 md:hidden',
  iconButton:
    'inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95',
} as const;
