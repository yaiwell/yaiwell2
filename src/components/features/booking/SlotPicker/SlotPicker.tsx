'use client';

import { useTranslations } from 'next-intl';

import { formatSlotTime, splitSlotsByDayPart, useSlotPicker } from './SlotPicker.logic';
import { slotPickerStyles as s } from './SlotPicker.styles';
import type { SlotPickerProps } from './SlotPicker.types';

/**
 * Selector de slot para reservar un servicio.
 *
 * Client Component: el usuario navega entre días y selecciona un hueco
 * concreto. Combina una tira de días en la parte superior y una cuadrícula
 * de huecos divididos por mañana/tarde debajo. Renderiza los slots ocupados
 * con tipografía tachada (visible pero no interactivo) para que el usuario
 * perciba la "densidad real" del centro y entienda por qué su hueco preferido
 * podría no estar disponible.
 */
export function SlotPicker({
  providerId,
  serviceId,
  serviceDurationMinutes,
  locale,
  selectedStartIso,
  onSelect,
  now,
}: SlotPickerProps) {
  const t = useTranslations('booking.slotPicker');

  const { dayTabs, setSelectedDay, slots } = useSlotPicker({
    providerId,
    serviceId,
    serviceDurationMinutes,
    locale,
    now,
  });

  const { morning, afternoon } = splitSlotsByDayPart(slots);
  const isEmpty = slots.length === 0;

  return (
    <div className={s.root} data-component="booking-slot-picker">
      <div className={s.dayStrip} role="tablist" aria-label={t('dayStripLabel')}>
        {dayTabs.map((tab) => {
          const className = `${s.dayTabBase} ${tab.isSelected ? s.dayTabSelected : s.dayTabIdle}`;
          return (
            <button
              key={tab.date.toISOString()}
              type="button"
              role="tab"
              aria-selected={tab.isSelected}
              className={className}
              onClick={() => setSelectedDay(tab.date)}
              data-component={`booking-slot-picker-day-${tab.date.toISOString().slice(0, 10)}`}
            >
              <span className={s.dayTabWeekday}>{tab.weekdayShort}</span>
              <span className={s.dayTabNumber}>{tab.dayOfMonth}</span>
              {tab.isToday && <span className={s.dayTabTodayDot} aria-hidden />}
            </button>
          );
        })}
      </div>

      {isEmpty ? (
        <div className={s.empty} data-component="booking-slot-picker-empty">
          <p className={s.emptyTitle}>{t('emptyTitle')}</p>
          <p className={s.emptySubtitle}>{t('emptySubtitle')}</p>
        </div>
      ) : (
        <>
          <p className={s.sectionTitle}>{t('morning')}</p>
          {morning.length === 0 ? (
            <p className={s.sectionEmpty}>{t('noMorningSlots')}</p>
          ) : (
            <div className={s.slotGrid}>
              {morning.map((slot) => (
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

          <p className={s.sectionTitle}>{t('afternoon')}</p>
          {afternoon.length === 0 ? (
            <p className={s.sectionEmpty}>{t('noAfternoonSlots')}</p>
          ) : (
            <div className={s.slotGrid}>
              {afternoon.map((slot) => (
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
      )}
    </div>
  );
}

/**
 * Botón individual de slot. Pequeño helper local porque no necesita
 * estado ni reutilización fuera de este componente.
 */
function SlotButton({
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
