'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

// Importamos del archivo client-safe, NUNCA del barrel
// `@/lib/services/availability`: ese reexporta el service y arrastraría
// Prisma (`pg → dns/fs/net/tls`) al bundle del navegador.
import {
  BUSINESS_TIMEZONE,
  fetchServiceSlots,
  type BookingSlot,
} from '@/lib/services/availability/availability.client';
import { toIntlLocale } from '@/lib/i18n';
import { buildUpcomingDays, getDateKey } from '@/lib/utils/calendar-days';

import type { DayTab, SlotPickerLocale } from './SlotPicker.types';

/**
 * Cantidad de días navegables que se muestran a la vez en la tira
 * superior. 14 días = dos semanas; suficiente para cubrir la espontaneidad
 * sin abrumar el scroll horizontal.
 */
const VISIBLE_DAYS = 14;

/**
 * Hora (en zona del centro) a partir de la cual un hueco se considera
 * "Tarde". Coincide con el cierre típico de la jornada de mañana.
 */
const AFTERNOON_START_HOUR = 14;

/**
 * Formateador de la hora del centro. Se crea una sola vez porque
 * instanciar `Intl.DateTimeFormat` es caro y aquí se invoca una vez por
 * slot en cada render.
 *
 * `hourCycle: 'h23'` garantiza `0..23` (con `h24` la medianoche sería
 * "24" y rompería la comparación numérica).
 */
const businessHourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIMEZONE,
  hour: 'numeric',
  hourCycle: 'h23',
});

/**
 * Devuelve la hora (0-23) de un instante **en la zona del centro**.
 *
 * No usamos `Date#getHours()` porque devuelve la hora local del
 * navegador: un cliente en Berlín vería un hueco de las 13:30 de Madrid
 * como las 14:30 y lo colocaríamos bajo "Tarde" mientras la etiqueta
 * dice "13:30" (`formatSlotTime` sí renderiza en Madrid). El usuario
 * leía una contradicción en la misma pantalla.
 */
function getBusinessHour(iso: string): number {
  const parts = businessHourFormatter.formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '0';
  return Number.parseInt(hour, 10);
}

/**
 * Devuelve la abreviatura del día de la semana según el locale, con
 * la primera letra en mayúscula y sin punto final. `Intl.DateTimeFormat`
 * ya entrega la forma localizada; aquí solo normalizamos formato.
 */
function formatWeekdayShort(date: Date, locale: SlotPickerLocale): string {
  const formatter = new Intl.DateTimeFormat(toIntlLocale(locale), {
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
 * "Tarde" (>=14:00), **usando la hora del centro**, no la del navegador.
 *
 * Mantiene el orden original dentro de cada bloque.
 *
 * @param slots — huecos tal y como los devuelve la API.
 * @returns los mismos huecos repartidos en dos listas.
 */
export function splitSlotsByDayPart(slots: BookingSlot[]): {
  morning: BookingSlot[];
  afternoon: BookingSlot[];
} {
  const morning: BookingSlot[] = [];
  const afternoon: BookingSlot[] = [];
  for (const slot of slots) {
    if (getBusinessHour(slot.startAtIso) < AFTERNOON_START_HOUR) morning.push(slot);
    else afternoon.push(slot);
  }
  return { morning, afternoon };
}

/**
 * Formatea un slot a `HH:MM` en la zona horaria del centro
 * (`Europe/Madrid`), no la del navegador del usuario.
 *
 * Esto es importante para UX honesta: un cliente alemán de visita en
 * España consultando la ficha de un centro debe ver `10:00` (hora a la
 * que el centro abre) y no `09:00` (mismo instante visto desde Berlín
 * UTC+1). El motor `availability.calc` ya devuelve `startAt` como
 * instante UTC interpretando los `HH:mm` del schedule como Madrid;
 * aquí simplemente le pedimos a `Intl` que renderice esa hora en la
 * misma zona donde está el negocio.
 */
export function formatSlotTime(slot: BookingSlot, locale: SlotPickerLocale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date(slot.startAtIso));
}

/**
 * Hook que gestiona el estado y los datos derivados del SlotPicker.
 *
 * Centraliza:
 *  - Día seleccionado (estado local controlado).
 *  - Carga de slots reales para ese día via TanStack Query
 *    (`/api/availability/services/[serviceId]`). El motor `availability.service`
 *    consulta `Professional.schedule` + bookings activas del día, así
 *    que los huecos reflejan la realidad del centro.
 *  - Construcción de las pestañas de día con metadatos visuales.
 *  - Los tres estados que la UI debe distinguir: cargando, error y
 *    cargado (con o sin huecos). Colapsarlos hacía que un 500 del
 *    servidor se leyera como "este centro no tiene hueco".
 *
 * Mantenemos `now` como parámetro inyectable para los tests, igual que
 * `ProviderHeader.logic.ts`, evitando llamar `Date.now()` en render.
 *
 * `providerId` queda como prop por compat histórica del componente UI;
 * el endpoint resuelve provider+professional internamente desde el
 * `serviceId`, así que aquí no lo usamos para la query.
 */
export function useSlotPicker(args: {
  providerId: string;
  serviceId: string;
  serviceDurationMinutes: number;
  locale: SlotPickerLocale;
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

  const dateKey = getDateKey(selectedDay);
  const query = useQuery<BookingSlot[]>({
    // queryKey segmentado por serviceId + día: cache automático cuando
    // el usuario vuelve a un día ya consultado.
    queryKey: ['availability', args.serviceId, dateKey],
    queryFn: ({ signal }) => fetchServiceSlots(args.serviceId, dateKey, signal),
    // Slots cambian poco en minutos: caché 60s para evitar refetch
    // agresivo al hacer click rápido entre días.
    staleTime: 60_000,
    // Deliberadamente SIN `placeholderData`: mantener los huecos del día
    // anterior mientras carga el nuevo pinta horas que no pertenecen a la
    // pestaña marcada. El esqueleto ya evita el salto de layout y no
    // miente.
  });

  return {
    now,
    dayTabs,
    selectedDay,
    selectedDayKey: dateKey,
    setSelectedDay,
    slots: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    /** Reintento manual tras un fallo, sin recargar la página entera. */
    refetch: query.refetch,
  };
}
