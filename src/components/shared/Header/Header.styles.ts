/**
 * Estilos del componente Header.
 *
 * Centralizamos las clases Tailwind aquí para mantener el JSX limpio y
 * facilitar futuras variantes (modo oscuro, contraste alto, etc.).
 */
export const headerStyles = {
  root: 'sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70',
  container: 'mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-20 md:px-8',
  brand:
    'flex items-center gap-2 font-medium tracking-tight text-foreground transition-opacity hover:opacity-80',
  brandMark:
    'inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-rose to-brand-peach text-white shadow-sm',
  brandText: 'font-display text-xl md:text-2xl tracking-tight',
  desktopNav: 'hidden items-center gap-7 md:flex',
  navLink: 'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
  desktopActions: 'hidden items-center gap-2 md:flex',
  desktopProvidersLink:
    'mr-2 hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex',
  mobileActions: 'flex items-center gap-2 md:hidden',
  iconButton:
    'inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted',
} as const;
