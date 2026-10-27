import { Zap } from 'lucide-react';
import { useId } from 'react';

import { SlotButton } from './SlotButton';
import { formatSlotTime } from './SlotPicker.logic';
import { slotPickerStyles as s } from './SlotPicker.styles';
import type { SlotSectionProps } from './SlotPicker.types';

/**
 * Bloque de huecos con título (Mañana, Tarde o "En las próximas 2 h").
 *
 * La rejilla es un `role="group"` etiquetado por el título: un lector
 * de pantalla anuncia la condición del grupo al entrar en él, así que
 * la marca de última hora no depende del color.
 *
 * Si no hay huecos, pinta `emptyText`; si `emptyText` es `null`, no
 * pinta nada (evita "No quedan huecos por la mañana" cuando esos huecos
 * están en el grupo de última hora).
 */
export function SlotSection({
  title,
  emptyText,
  slots,
  selectedStartIso,
  locale,
  onSelect,
  lastMinute = false,
}: SlotSectionProps) {
  const titleId = useId();

  if (slots.length === 0 && emptyText === null) return null;

  return (
    <>
      <p
        className={lastMinute ? s.sectionTitleLastMinute : s.sectionTitle}
        id={titleId}
        data-component={lastMinute ? 'booking-slot-picker-last-minute-group' : undefined}
      >
        {lastMinute && <Zap className={s.sectionTitleIcon} aria-hidden />}
        {title}
      </p>
      {slots.length === 0 ? (
        <p className={s.sectionEmpty}>{emptyText}</p>
      ) : (
        <div className={s.slotGrid} role="group" aria-labelledby={titleId}>
          {slots.map((slot) => (
            <SlotButton
              key={slot.startAtIso}
              label={formatSlotTime(slot, locale)}
              available={slot.available}
              selected={slot.startAtIso === selectedStartIso}
              onClick={() => onSelect(slot)}
            />
          ))}
        </div>
      )}
    </>
  );
}
