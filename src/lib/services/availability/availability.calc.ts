import type { Slot, Weekday, WeekdayBlock, WeeklySchedule } from './availability.types';

/**
 * Cálculo puro de slots.
 *
 * Este módulo NO toca Prisma ni efectos secundarios. Recibe el horario
 * ya parseado y las reservas existentes y devuelve la lista de slots
 * libres. Mantenerlo puro permite testearlo sin mocks y reutilizarlo
 * desde otros sitios (preview en el panel del proveedor, simulación de
 * cambios de horario, etc.).
 */

/**
 * Orden de días tal y como los devuelve `Date#getUTCDay()`:
 * 0 = domingo, 1 = lunes, ..., 6 = sábado.
 *
 * Cuando JavaScript añada una API decente para esto podremos retirar
 * la tabla; mientras tanto sirve para mapear sin condicionales largos.
 */
const WEEKDAYS_BY_INDEX: readonly Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/**
 * Convierte el `getUTCDay()` de una fecha a la clave correspondiente
 * de `WeeklySchedule`.
 */
export function getWeekdayKey(date: Date): Weekday {
  return WEEKDAYS_BY_INDEX[date.getUTCDay()];
}

/**
 * Parsea `"HH:mm"` a minutos desde medianoche.
 *
 * Asume que `value` ya pasó por el regex de validación; aun así
 * devolvemos `NaN` si no parsea para no propagar valores raros.
 */
function timeStringToMinutes(value: string): number {
  const [hh, mm] = value.split(':');
  const hours = Number(hh);
  const minutes = Number(mm);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.NaN;
  return hours * 60 + minutes;
}

/**
 * Devuelve el offset (en minutos) de una zona horaria IANA respecto a
 * UTC para un instante dado. Útil para mapear hora local → UTC
 * respetando DST (cambio horario verano/invierno).
 *
 * Usa `Intl.DateTimeFormat` con `timeZoneName: 'longOffset'` que
 * devuelve algo como `"GMT+02:00"` — lo parseamos para sacar minutos.
 */
function getTimezoneOffsetMinutes(instant: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  });
  const parts = formatter.formatToParts(instant);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  // Formatos posibles: "GMT+02:00", "GMT-05:00", "GMT" (sin offset = +0).
  const match = offsetPart.match(/GMT([+-])(\d{1,2}):(\d{2})/u);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  return sign * (hours * 60 + minutes);
}

/**
 * Construye un `Date` (instante UTC) a partir del día `dayUtc` y la
 * hora `minutesFromMidnight`.
 *
 * Si `timezone` se especifica, los `minutesFromMidnight` se interpretan
 * como hora **local de esa zona** y se aplica el offset para devolver
 * el instante UTC equivalente. Ejemplo: `dayUtc=2026-07-01T00:00:00Z`
 * + `minutesFromMidnight=600` + `timezone='Europe/Madrid'` →
 * `2026-07-01T08:00:00Z` (10:00 Madrid CEST = 08:00 UTC).
 *
 * Si `timezone` es `undefined`, los minutos se interpretan como UTC
 * literal (comportamiento histórico que conservan los tests del motor).
 *
 * El cálculo del offset usa el propio instante "naive" como referencia:
 * en los días de cambio horario el offset varía dentro del mismo día,
 * pero como las horas del schedule (10:00, 18:00…) caen lejos de las
 * 03:00 madrugada donde ocurre el cambio, no hay edge case relevante.
 */
function buildUtcDateAt(
  dayUtc: Date,
  minutesFromMidnight: number,
  timezone: string | undefined,
): Date {
  const naive = new Date(
    Date.UTC(
      dayUtc.getUTCFullYear(),
      dayUtc.getUTCMonth(),
      dayUtc.getUTCDate(),
      0,
      minutesFromMidnight,
      0,
      0,
    ),
  );
  if (!timezone) return naive;
  const offsetMinutes = getTimezoneOffsetMinutes(naive, timezone);
  return new Date(naive.getTime() - offsetMinutes * 60_000);
}

/**
 * Devuelve el inicio (00:00 UTC) y el fin (siguiente 00:00 UTC) del día
 * en el que cae `date`. Es lo que el repositorio usará para acotar la
 * búsqueda de bookings.
 */
export function getUtcDayBounds(date: Date): { dayStart: Date; dayEnd: Date } {
  const dayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, dayEnd };
}

/**
 * Comprueba si dos intervalos `[aStart, aEnd)` y `[bStart, bEnd)` se
 * solapan. Usamos el criterio estricto (`<` en los extremos) para que
 * dos reservas consecutivas pegadas exactamente no cuenten como solape.
 */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/**
 * Trocea un bloque `[openMin, closeMin)` del día `dayUtc` en slots de
 * duración `serviceDurationMinutes` con `bufferMinutes` de margen al
 * siguiente slot, excluyendo los que se solapen con `bookings`.
 *
 * El bloque puede no producir ningún slot si la duración no cabe.
 * El buffer se suma al paso entre slots (no al final del bloque) — así
 * el último cliente del día sigue pudiendo empezar a `close - duration`.
 */
function buildSlotsForBlock(
  dayUtc: Date,
  block: WeekdayBlock,
  serviceDurationMinutes: number,
  bufferMinutes: number,
  bookings: readonly { startAt: Date; endAt: Date }[],
  timezone: string | undefined,
): Slot[] {
  const openMin = timeStringToMinutes(block.open);
  const closeMin = timeStringToMinutes(block.close);
  if (!Number.isFinite(openMin) || !Number.isFinite(closeMin)) return [];

  // Paso entre slots: duración del servicio + buffer de limpieza.
  // Si la suma es 0 (caso inválido) cortamos para no entrar en bucle.
  const stepMin = serviceDurationMinutes + bufferMinutes;
  if (stepMin <= 0) return [];

  const slots: Slot[] = [];
  for (let m = openMin; m + serviceDurationMinutes <= closeMin; m += stepMin) {
    const startAt = buildUtcDateAt(dayUtc, m, timezone);
    const endAt = new Date(startAt.getTime() + serviceDurationMinutes * 60_000);

    // Descartamos el slot si solapa con alguna reserva activa. Las
    // reservas vienen ordenadas por startAt pero hacemos un linear scan
    // porque suelen ser pocas por día y simplifica el código.
    const collides = bookings.some((b) => overlaps(startAt, endAt, b.startAt, b.endAt));
    if (!collides) {
      slots.push({ startAt, endAt });
    }
  }

  return slots;
}

/**
 * Calcula la lista completa de slots disponibles de un día concreto a
 * partir del horario semanal, las reservas activas, la duración del
 * servicio y el buffer del profesional.
 *
 * @returns slots ordenados ascendentemente por `startAt`.
 */
export function computeAvailableSlots(params: {
  date: Date;
  schedule: WeeklySchedule;
  bufferMinutes: number;
  serviceDurationMinutes: number;
  bookings: readonly { startAt: Date; endAt: Date }[];
  /**
   * Zona horaria (IANA) en la que se interpretan los `HH:mm` del
   * schedule. Si se omite, los minutos se tratan como UTC literal
   * (comportamiento histórico que mantienen los tests del motor puro).
   * Producción siempre pasa `'Europe/Madrid'`.
   */
  timezone?: string;
}): Slot[] {
  const { date, schedule, bufferMinutes, serviceDurationMinutes, bookings, timezone } = params;

  const weekday = getWeekdayKey(date);
  const blocks = schedule[weekday];
  if (!blocks || blocks.length === 0) return [];

  const result: Slot[] = [];
  for (const block of blocks) {
    const blockSlots = buildSlotsForBlock(
      date,
      block,
      serviceDurationMinutes,
      bufferMinutes,
      bookings,
      timezone,
    );
    result.push(...blockSlots);
  }

  return result;
}

/**
 * Determina si un slot concreto `[slotStart, slotStart + duration)`
 * está libre frente a una lista de reservas activas.
 *
 * Helper expuesto para que `booking.service` lo invoque justo antes
 * de crear una reserva, evitando una segunda lectura del horario.
 */
export function isSlotFree(
  slotStart: Date,
  durationMinutes: number,
  bookings: readonly { startAt: Date; endAt: Date }[],
): boolean {
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
  return !bookings.some((b) => overlaps(slotStart, slotEnd, b.startAt, b.endAt));
}
