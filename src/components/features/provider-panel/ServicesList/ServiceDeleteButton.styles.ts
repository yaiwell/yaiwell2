/**
 * Estilos del componente ServiceDeleteButton.
 *
 * El trigger es un botón ghost pequeño con tono destructive sutil,
 * coherente con el resto de acciones secundarias del listado.
 * El AlertDialog usa overlay con blur y un panel centrado redondeado
 * que sigue el lenguaje visual de los Dialog/Sheet del proyecto.
 */
export const serviceDeleteButtonStyles = {
  // Trigger: ghost con tono destructive para señalar acción destructiva
  // sin gritar visualmente; el énfasis fuerte queda para el diálogo.
  triggerButton:
    'text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/30',

  // Overlay del diálogo con blur y fondo semitransparente.
  overlay:
    'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',

  // Panel centrado en pantalla. Ancho fijo cómodo en desktop, full-width
  // en móvil con padding lateral para respetar la safe-area visual.
  content:
    'fixed left-1/2 top-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',

  title: 'font-display text-xl text-foreground',
  description: 'text-sm leading-relaxed text-muted-foreground',

  // Banner de error tras intentar borrar (FORBIDDEN, NOT_FOUND, INTERNAL).
  errorBanner:
    'rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',

  // Acciones: alineadas a la derecha en desktop, apiladas en móvil pequeño
  // (col-reverse para que el botón destructivo quede arriba, regla heredada
  // de accesibilidad: la primary va más cerca del pulgar en mobile-first).
  actions: 'mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
} as const;
