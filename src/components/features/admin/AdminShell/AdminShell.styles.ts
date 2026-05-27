/**
 * Estilos del shell del área admin.
 *
 * Más sobrio que el shell público: fondo neutral, tipografía monoespaciada
 * en el badge "admin", separadores precisos. Es una herramienta interna,
 * no una experiencia de marca.
 */
export const adminShellStyles = {
  root: 'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:py-8',
  topbar:
    'flex flex-col gap-3 rounded-3xl border border-border/60 bg-card/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5',
  brandRow: 'flex items-center gap-3',
  brandBadge:
    'inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-background',
  brandTitle: 'font-display text-lg text-foreground',
  brandSubtitle: 'text-xs text-muted-foreground',
  nav: 'flex flex-wrap items-center gap-2 text-sm',
  navLink:
    'inline-flex items-center gap-1 rounded-full border border-transparent px-3 py-1.5 text-muted-foreground transition-colors duration-150 hover:border-border hover:text-foreground focus-visible:border-border focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  main: 'flex flex-1 flex-col gap-8',
} as const;
