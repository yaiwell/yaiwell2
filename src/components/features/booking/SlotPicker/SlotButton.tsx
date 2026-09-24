import { slotPickerStyles as s } from './SlotPicker.styles';

/**
 * Botón individual de un hueco de la rejilla.
 *
 * Los huecos no disponibles se renderizan tachados y deshabilitados en
 * lugar de ocultarse: enseñar la densidad real del centro ayuda a que el
 * usuario entienda por qué su hora preferida no está.
 */
export function SlotButton({
  label,
  available,
  selected,
  onClick,
}: {
  label: string;
  available: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  // Resolución de variante en este orden: ocupado > seleccionado > libre.
  const variantClass = !available
    ? s.slotButtonDisabled
    : selected
      ? s.slotButtonSelected
      : s.slotButtonIdle;

  return (
    <button
      type="button"
      disabled={!available}
      aria-pressed={selected}
      onClick={onClick}
      className={`${s.slotButtonBase} ${variantClass}`}
      data-component={`booking-slot-picker-slot-${label.replace(':', '')}`}
    >
      {label}
    </button>
  );
}
