/**
 * Estilos del aviso de bloqueo «solo online» en `/mis-reservas`.
 *
 * Tono informativo, no de error: es una condición temporal de la cuenta.
 * Par `status-busy` (AA en claro y oscuro) e icono además del texto.
 */
export const onsiteRestrictionNoticeStyles = {
  root: 'flex items-start gap-3 rounded-3xl border border-status-busy-foreground/25 bg-status-busy px-5 py-4 text-status-busy-foreground',
  icon: 'mt-0.5 size-5 shrink-0',
  body: 'flex flex-col gap-1',
  title: 'text-sm font-semibold',
  text: 'text-sm leading-relaxed',
} as const;
