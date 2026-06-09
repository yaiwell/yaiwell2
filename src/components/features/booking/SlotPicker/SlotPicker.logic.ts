'use client';

import { useMemo, useState } from 'react';

import {
  buildUpcomingDays,
  generateBookingSlots,
  getDateKey,
  type BookingSlot,
} from '@/lib/fake-data/booking-slots';

import type { DayTab } from './SlotPicker.types';

/**
 * Cantidad de días navegables que se muestran a la vez en la tira
 * superior. 14 días = dos semanas; suficiente para cubrir la espontaneidad
 * sin abrumar el scroll horizontal.
 */
const VISIBLE_DAYS = 14;

/**
 * Devuelve la abreviatura del día de la semana según el locale, con
 * la primera letra en mayúscula y sin punto final. `Intl.DateTimeFormat`
 * ya entrega la forma localizada; aquí solo normalizamos formato.
 */
function formatWeekdayShort(date: Date, locale: 'es' | 'ca' | 'en' | 'de'): string {
  const formatter = new Intl.DateTimeFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    weekday: 'short',
  });
  const raw = formatter.format(date).replace('.', '').trim();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Comprueba si dos `Date` representan el mismo día en zona horaria local.
 * Lo usamos para marcar el día activo y el día "hoy" sin caer en bugs
 * por horas/minutos arrastrados.
 */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Particiona la lista de slots en bloques de "Mañana" (<14:00) y
 * "Tarde" (>=14:00). Mantiene el orden original dentro de cada bloque.
 */
export function splitSlotsByDayPart(slots: BookingSlot[]): {
  morning: BookingSlot[];
  afternoon: BookingSlot[];
} {
  const morning: BookingSlot[] = [];
  const afternoon: BookingSlot[] = [];
  for (const slot of slots) {
    const startHour = new Date(slot.startAtIso).getHours();
    if (startHour < 14) morning.push(slot);
    else afternoon.push(slot);
  }
  return { morning, afternoon };
}

/**
 * Formatea un slot a `HH:MM` localizado. Usamos `Intl.DateTimeFormat`
 * para respetar el formato 24h del usuario europeo sin reimplementar.
 */
export function formatSlotTime(slot: BookingSlot, locale: 'es' | 'ca' | 'en' | 'de'): string {
  return new Intl.DateTimeFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(slot.startAtIso));
}

/**
 * Hook que gestiona el estado y los datos derivados del SlotPicker.
 *
 * Centraliza:
 *  - Día seleccionado (estado local controlado).
 *  - Generación determinista de slots para ese día.
 *  - Construcción de las pestañas de día con metadatos visuales.
 *
 * Mantenemos `now` como parámetro inyectable para los tests, igual que
 * `ProviderHeader.logic.ts`, evitando llamar `Date.now()` en render.
 */
export function useSlotPicker(args: {
  providerId: string;
  serviceId: string;
  serviceDurationMinutes: number;
  locale: 'es' | 'ca' | 'en' | 'de';
  now?: Date;
}) {
  // El instante de referencia se fija al montar el hook para que el
  // calendario no "salte" si el usuario tarda en interactuar.
  const [now] = useState<Date>(() => args.now ?? new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  );

  const days = useMemo<Date[]>(() => buildUpcomingDays(now, VISIBLE_DAYS), [now]);

  const dayTabs = useMemo<DayTab[]>(
    () =>
      days.map((date) => ({
        date,
        weekdayShort: formatWeekdayShort(date, args.locale),
        dayOfMonth: date.getDate(),
        isSelected: isSameLocalDay(date, selectedDay),
        isToday: isSameLocalDay(date, now),
      })),
    [days, args.locale, selectedDay, now],
  );

  const slots = useMemo<BookingSlot[]>(
    () =>
      generateBookingSlots(
        args.providerId,
        args.serviceId,
        selectedDay,
        args.serviceDurationMinutes,
        now,
      ),
    [args.providerId, args.serviceId, args.serviceDurationMinutes, selectedDay, now],
  );

  return {
    now,
    dayTabs,
    selectedDay,
    selectedDayKey: getDateKey(selectedDay),
    setSelectedDay,
    slots,
  };
}
