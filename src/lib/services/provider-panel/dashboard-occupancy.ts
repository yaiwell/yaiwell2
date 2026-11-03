import type { WeeklySchedule } from '@/lib/services/availability/availability.types';
import { getWeekDateKeys, madridLocalToUtc } from '@/lib/utils/madrid-week';

/** Intervalo de tiempo en UTC. */
export interface Interval {
  startAt: Date;
  endAt: Date;
}

const WEEKDAYS: (keyof WeeklySchedule)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Tramos abiertos de una semana según el horario, en instantes UTC.
 *
 * El horario se interpreta en hora de Madrid día a día (`madridLocalToUtc`),
 * así que una semana con cambio de hora da los tramos correctos.
 */
export function openIntervalsForWeek(schedule: WeeklySchedule, weekStartKey: string): Interval[] {
  const dateKeys = getWeekDateKeys(weekStartKey);
  return WEEKDAYS.flatMap((day, index) =>
    schedule[day].map((block) => ({
      startAt: madridLocalToUtc(dateKeys[index], block.open),
      endAt: madridLocalToUtc(dateKeys[index], block.close),
    })),
  );
}

/** Minutos que `a` y `b` tienen en común. */
function overlapMinutes(a: Interval, b: Interval): number {
  const start = Math.max(a.startAt.getTime(), b.startAt.getTime());
  const end = Math.min(a.endAt.getTime(), b.endAt.getTime());
  return end > start ? (end - start) / 60_000 : 0;
}

/**
 * Minutos que cubren los `busy` dentro de `open`. Los `busy` se fusionan
 * antes para no contar dos veces un solape (dos bloqueos que se pisan).
 */
function coveredMinutes(open: Interval[], busy: Interval[]): number {
  const merged: Interval[] = [];
  for (const item of [...busy].sort((a, b) => a.startAt.getTime() - b.startAt.getTime())) {
    const last = merged.at(-1);
    if (last && item.startAt <= last.endAt) {
      if (item.endAt > last.endAt) last.endAt = item.endAt;
    } else {
      merged.push({ startAt: item.startAt, endAt: item.endAt });
    }
  }
  return open.reduce(
    (sum, slot) => sum + merged.reduce((acc, b) => acc + overlapMinutes(slot, b), 0),
    0,
  );
}

/** Minutos disponibles y reservados de un profesional en una semana. */
export interface OccupancyMinutes {
  availableMinutes: number;
  bookedMinutes: number;
}

/**
 * Minutos de una semana de un profesional.
 *
 * Disponible = horario abierto menos bloqueos de agenda (las vacaciones no
 * deben hundir la ocupación). Reservado = la parte de cada reserva que cae
 * dentro del horario abierto.
 *
 * @param schedule — horario semanal del profesional.
 * @param weekStartKey — lunes de la semana (`YYYY-MM-DD`, hora Madrid).
 * @param bookings — reservas suyas que cuentan como ocupación.
 * @param blocks — sus bloqueos de agenda activos de esa semana.
 */
export function computeOccupancyMinutes(
  schedule: WeeklySchedule,
  weekStartKey: string,
  bookings: Interval[],
  blocks: Interval[],
): OccupancyMinutes {
  const open = openIntervalsForWeek(schedule, weekStartKey);
  const openMinutes = open.reduce((sum, slot) => sum + overlapMinutes(slot, slot), 0);
  return {
    availableMinutes: Math.max(0, openMinutes - coveredMinutes(open, blocks)),
    bookedMinutes: coveredMinutes(open, bookings),
  };
}

/**
 * Porcentaje entero (0-100) de una suma de minutos. Sin horas
 * disponibles devuelve 0.
 */
function toPct(minutes: OccupancyMinutes[]): number {
  const available = minutes.reduce((sum, m) => sum + m.availableMinutes, 0);
  if (available <= 0) return 0;
  const booked = minutes.reduce((sum, m) => sum + m.bookedMinutes, 0);
  return Math.min(100, Math.round((booked / available) * 100));
}

/**
 * Ocupación de una semana de UN profesional: minutos reservados entre
 * minutos disponibles, en porcentaje entero (0-100).
 */
export function computeOccupancyPct(
  schedule: WeeklySchedule,
  weekStartKey: string,
  bookings: Interval[],
  blocks: Interval[],
): number {
  return toPct([computeOccupancyMinutes(schedule, weekStartKey, bookings, blocks)]);
}

/** Datos de un profesional para la ocupación del equipo. */
export interface TeamMemberOccupancyInput {
  schedule: WeeklySchedule;
  bookings: Interval[];
  blocks: Interval[];
}

/**
 * Ocupación del equipo en una semana (CLAUDE.md §4.bis «Equipo»):
 * capacidad = suma de las horas abiertas de cada profesional menos sus
 * bloqueos; reservado = suma de lo reservado a cada uno. Así dos
 * profesionales con 4 h cada uno y una reserva de 2 h dan un 25 %, no
 * un 50 %.
 */
export function computeTeamOccupancyPct(
  members: TeamMemberOccupancyInput[],
  weekStartKey: string,
): number {
  return toPct(
    members.map((m) => computeOccupancyMinutes(m.schedule, weekStartKey, m.bookings, m.blocks)),
  );
}
