/**
 * Estilos del selector autónomo / empresa.
 *
 * Las dos opciones tienen exactamente el mismo peso visual: ninguna
 * viene marcada por defecto ni destacada, para que la sociedad no se dé
 * de alta como autónomo por inercia.
 */
export const businessTypePickerStyles = {
  fieldset: 'flex flex-col gap-2',
  legend: 'mb-2 text-sm font-medium text-foreground',
  options: 'grid gap-2 sm:grid-cols-2',
  option:
    'flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 bg-background p-4 transition-colors duration-150 hover:bg-muted has-[:checked]:border-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
  radio: 'mt-0.5 size-4 shrink-0 accent-foreground',
  text: 'flex flex-col gap-1',
  label: 'text-sm font-medium text-foreground',
  hint: 'text-xs leading-relaxed text-muted-foreground',
} as const;
