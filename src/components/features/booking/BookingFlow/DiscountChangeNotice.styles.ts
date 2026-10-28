/**
 * Estilos del aviso de descuento perdido o cambiado en el paso de pago.
 *
 * Mismo lenguaje que el aviso de condiciones cambiadas: borde sólido y
 * texto en negrita, sin rojo. No ha fallado nada; solo hay que saberlo
 * antes de pagar.
 */
export const discountChangeNoticeStyles = {
  root: 'mb-5 rounded-2xl border border-foreground/30 bg-muted/60 px-4 py-3 text-sm font-semibold text-foreground',
} as const;
