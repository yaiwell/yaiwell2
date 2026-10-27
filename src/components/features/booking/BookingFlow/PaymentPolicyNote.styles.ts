/**
 * Estilos de las condiciones de cancelación del paso de pago.
 *
 * Tono neutro: son condiciones, no alertas. El aviso de "han cambiado"
 * se distingue por el texto en negrita y el borde sólido, no por color.
 */
export const paymentPolicyNoteStyles = {
  root: 'mb-5 flex flex-col gap-3',
  changed:
    'rounded-2xl border border-foreground/30 bg-muted/60 px-4 py-3 text-sm font-semibold text-foreground',
  cancelUntil: 'text-sm leading-relaxed text-muted-foreground',
} as const;
