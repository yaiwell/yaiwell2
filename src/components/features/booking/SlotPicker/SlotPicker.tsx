'use client';

import { useTranslations } from 'next-intl';

import { SlotButton } from './SlotButton';
import { SlotGridSkeleton } from './SlotGridSkeleton';
import { formatSlotTime, splitSlotsByDayPart, useSlotPicker } from './SlotPicker.logic';
import { slotPickerStyles as s } from './SlotPicker.styles';
import type { SlotPickerProps } from './SlotPicker.types';
import { SlotPickerError } from './SlotPickerError';

/**
 * Selector de slot para reservar un servicio.
 *
 * Client Component: el usuario navega entre días y selecciona un hueco
 * concreto. Combina una tira de días en la parte superior y una cuadrícula
 * de huecos divididos por mañana/tarde debajo.
 *
 * La tira de días se renderiza SIEMPRE (incluso cargando o con error)
 * para que el usuario pueda probar otro día sin esperar. Debajo hay tres
 * estados excluyentes y con copy propio — cargando, error y cargado —
 * porque colapsarlos hacía que un 500 del servidor se leyera como "este
 * centro no tiene hueco", que además de falso pierde la reserva.
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

  const { dayTabs, setSelectedDay, slots, isLoading, isError, isNotBookable, refetch } =
    useSlotPicker({
      providerId,
      serviceId,
      serviceDurationMinutes,
      locale,
      now,
    });

  const { morning, afternoon } = splitSlotsByDayPart(slots);

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

      {isLoading ? (
        <SlotGridSkeleton label={t('loadingLabel')} />
      ) : isNotBookable ? (
        // Respuesta definitiva del servidor, no un fallo: sin botón de reintentar.
        <div className={s.empty} data-component="booking-slot-picker-not-bookable">
          <p className={s.emptyTitle}>{t('notBookableTitle')}</p>
          <p className={s.emptySubtitle}>{t('notBookableSubtitle')}</p>
        </div>
      ) : isError ? (
        <SlotPickerError
          title={t('errorTitle')}
          subtitle={t('errorSubtitle')}
          retryLabel={t('retry')}
          onRetry={() => void refetch()}
        />
      ) : slots.length === 0 ? (
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
