/**
 * Estilos del componente MobileNav.
 *
 * Posicionado en bottom fixed con soporte de safe-area-inset-bottom para
 * dispositivos iOS con notch/home indicator. Backdrop blur para sensación
 * premium sin tapar el contenido del scroll.
 */
export const mobileNavStyles = {
  root: 'fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:hidden',
  // El contenedor usa `auto-cols-fr` + `grid-flow-col` para que las
  // columnas se distribuyan equitativamente sin depender del número
  // exacto de items (3 para provider, 4 para cliente).
  inner:
    'mx-auto grid max-w-md auto-cols-fr grid-flow-col gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]',
  // Microinteracciones: feedback de tap (`active:scale-95`) y focus visible
  // para usuarios de teclado. Es la nav principal en mobile.
  // `min-h-11` garantiza el touch target de 44px que recomienda WCAG/Apple
  // HIG (audit 2026-05-27 §B.6).
  link: 'flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95',
  linkActive: 'text-foreground',
  iconWrap: 'flex h-9 w-11 items-center justify-center rounded-full transition-colors',
  iconWrapActive: 'bg-foreground/5 text-foreground',
  label: 'leading-none',
} as const;
