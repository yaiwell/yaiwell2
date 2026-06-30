'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { buildUpcomingDays, getDateKey, type BookingSlot } from '@/lib/fake-data/booking-slots';

import type { DayTab } from './SlotPicker.types';

/**
 * Cantidad de días navegables que se muestran a la vez en la tira
 * superior. 14 días = dos semanas; suficiente para cubrir la espontaneidad
 * sin abrumar el scroll horizontal.
 */
const VISIBLE_DAYS = 14;

/**
 * Forma de los slots tal y como los devuelve el endpoint
 * `/api/availability/services/[serviceId]`. El motor sólo devuelve
 * slots disponibles, así que `available: true` es siempre constante.
 * Mantenemos el shape `BookingSlot` para no tocar el componente UI.
 */
interface SlotsApiResponse {
  slots: BookingSlot[];
  took: number;
}

interface SlotsApiError {
  error: { code: string; message: string };
}

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
 * Construye la URL del endpoint público de availability. Centralizada
 * en un helper para que el `queryKey` y la URL de fetch coincidan
 * exactamente — TanStack Query usa la clave como cache key.
 */
function buildSlotsUrl(serviceId: string, dateKey: string): string {
  return `/api/availability/services/${encodeURIComponent(serviceId)}?date=${dateKey}`;
}

/**
 * Hace fetch del endpoint público y devuelve la lista de `BookingSlot`.
 *
 * El motor sólo devuelve disponibles, así que el array está vacío
 * cuando no hay slots libres (la UI lo trata como "día sin huecos").
 * Lanza si la respuesta no es OK para que TanStack lo capture y
 * exponga `isError` al componente.
 */
async function fetchSlots(
  serviceId: string,
  dateKey: string,
  signal?: AbortSignal,
): Promise<BookingSlot[]> {
  const res = await fetch(buildSlotsUrl(serviceId, dateKey), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as SlotsApiError | null;
    throw new Error(payload?.error?.message ?? `Slots API ${res.status}`);
  }
  const json = (await res.json()) as SlotsApiResponse;
  return json.slots;
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

  const dateKey = getDateKey(selectedDay);
  const query = useQuery<BookingSlot[]>({
    // queryKey segmentado por serviceId + día: cache automático cuando
    // el usuario vuelve a un día ya consultado.
    queryKey: ['availability', args.serviceId, dateKey],
    queryFn: ({ signal }) => fetchSlots(args.serviceId, dateKey, signal),
    // Slots cambian poco en minutos: caché 60s para evitar refetch
    // agresivo al hacer click rápido entre días.
    staleTime: 60_000,
    // Mantenemos los slots del día anterior visibles mientras carga
    // el nuevo, así no hay parpadeo de "vacío" entre clics.
    placeholderData: (prev) => prev,
  });

  // El componente espera `slots: BookingSlot[]` sin loading state;
  // mientras carga devolvemos lista vacía. Si el componente quiere
  // distinguir "cargando" de "sin huecos" puede leer `query.isPending`
  // que también exponemos.
  const slots: BookingSlot[] = query.data ?? [];

  return {
    now,
    dayTabs,
    selectedDay,
    selectedDayKey: dateKey,
    setSelectedDay,
    slots,
    isLoading: query.isPending,
    isError: query.isError,
  };
}
