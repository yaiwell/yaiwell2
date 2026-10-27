/**
 * Estilos del aviso de valoración publicada.
 *
 * Usa el par semántico `status-now` (verde, ≥ 4.5:1 en ambos modos) que
 * ya comunica "todo en orden" en las badges de reserva confirmada.
 */
export const reviewFeedbackStyles = {
  // Contenedor propio: la región `status` siempre existe (los lectores de
  // pantalla solo anuncian cambios en regiones ya montadas) y, vacía, no
  // debe sumar el `gap` del layout de la página.
  root: 'flex flex-col',
  banner:
    'mb-6 flex items-start justify-between gap-3 rounded-2xl bg-status-now px-4 py-3 text-sm text-status-now-foreground ring-1 ring-inset ring-status-now-foreground/25',
  message: 'leading-relaxed',
  dismiss:
    'flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-status-now-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-now-foreground/50',
  dismissIcon: 'size-4',
} as const;
