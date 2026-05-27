/**
 * Estilos del banner de permiso de ubicación.
 *
 * Posición:
 *  - Mobile: fixed bottom centrado, con margen para no quedar tapado
 *    por la barra de navegación inferior (`bottom-24`).
 *  - Desktop: bottom-right, anclado a 1.5rem.
 *
 * Diseño: tarjeta sobre `bg-card` con borde sutil y sombra cálida.
 * Usamos exclusivamente tokens semánticos para que funcione tanto en
 * light como en dark sin variantes adicionales.
 */
export const locationPermissionBannerStyles = {
  // Wrapper exterior fijo. `z-50` por encima del Header sticky (z-40) y
  // del mapa. `pointer-events-none` en el wrapper para que el padding
  // lateral no bloquee clicks fuera de la tarjeta; la tarjeta restaura
  // `pointer-events-auto`.
  wrapper:
    'pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-6 md:right-6 md:left-auto md:inset-x-auto md:justify-end md:px-0',
  card: 'pointer-events-auto relative flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-lg shadow-foreground/5 backdrop-blur-sm md:p-5',
  // Cabecera con icono + título. El icono vive en una burbuja brand-sage
  // soft que en dark mode también respeta contraste (token *-soft).
  header: 'flex items-start gap-3',
  iconBubble:
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-sage-soft text-foreground',
  iconBubbleSvg: 'size-4',
  titleBlock: 'flex min-w-0 flex-1 flex-col gap-1',
  title: 'font-display text-base font-semibold leading-tight text-foreground',
  body: 'text-sm text-muted-foreground',
  // Botón de cierre (X) en la esquina superior derecha. Pequeño,
  // accesible y con focus-visible obligatorio.
  dismissButton:
    'absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-95',
  dismissIcon: 'size-4',
  // Bloque de acciones. En mobile en columna; en desktop horizontal.
  actions: 'mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
} as const;
