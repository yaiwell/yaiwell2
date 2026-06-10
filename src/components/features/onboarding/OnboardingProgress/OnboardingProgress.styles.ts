/**
 * Estilos del stepper minimalista del wizard.
 *
 * Diseño: bolitas con número alineadas horizontalmente, conectadas por
 * una barra de progreso de fondo. Mobile-first: en móvil ocupa todo el
 * ancho disponible; las etiquetas de paso se ocultan bajo 640px porque
 * el texto bajo cada bolita rompe el layout en pantallas estrechas.
 */
export const onboardingProgressStyles = {
  root: 'flex w-full flex-col gap-3',
  // `items-start` para que las bolitas estén alineadas arriba del
  // wrapper; los labels (de distintas alturas posibles) cuelgan
  // debajo sin desplazar a las bolitas. La línea se posiciona
  // explícitamente a la mitad de la altura de la bolita (size-8 →
  // 32px / 2 = 16px = `top-4`), no al centro del wrapper.
  trackWrapper: 'relative flex w-full items-start justify-between',
  track: 'absolute left-0 right-0 top-4 h-px -translate-y-1/2 bg-border',
  trackFill:
    'absolute left-0 top-4 h-px -translate-y-1/2 bg-primary transition-all duration-300 ease-out',
  step: 'relative z-10 flex flex-col items-center gap-2',
  dotBase:
    'flex size-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
  dotPending: 'border-border bg-card text-muted-foreground',
  dotCurrent: 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20',
  dotDone: 'border-primary bg-primary/15 text-primary',
  label: 'hidden text-center text-[11px] font-medium text-muted-foreground sm:block',
  labelCurrent: 'text-foreground',
  caption: 'text-center text-xs text-muted-foreground',
} as const;
