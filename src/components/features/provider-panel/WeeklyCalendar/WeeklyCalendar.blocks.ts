import {
  HOUR_HEIGHT_PX,
  MIN_BLOCK_HEIGHT_PX,
  WEEKDAY_KEYS,
  getMinutesSpan,
  type TimeSpan,
} from './WeeklyCalendar.logic';
import type {
  PanelScheduleBlock,
  PositionedScheduleBlock,
  WeekdayKey,
} from './WeeklyCalendar.types';

const DAY_START_TIME = '00:00';
const DAY_END_TIME = '24:00';

/**
 * Tramos de bloqueo que pueden ampliar las horas visibles de la rejilla.
 *
 * Solo cuentan los que empiezan y terminan dentro de su día: un bloqueo
 * explícito de 22:00 a 23:00 tiene que verse. Los que tocan medianoche
 * (días completos o trozos de un bloqueo de varios días) no amplían la
 * rejilla: si no, una semana de vacaciones la estiraría a 00:00–24:00 y
 * el resto del calendario se volvería ilegible. Esos se recortan.
 *
 * @param blocks — tramos de la semana visible.
 * @returns franjas que se pasan a `getHoursRange` como `extraSpans`.
 */
export function getScheduleBlockRangeSpans(blocks: PanelScheduleBlock[]): TimeSpan[] {
  return blocks.filter(
    (b) => !b.isFullDay && b.startTime !== DAY_START_TIME && b.endTime !== DAY_END_TIME,
  );
}

/**
 * Agrupa los tramos de bloqueo por día y los recorta a las horas
 * visibles de la rejilla. Un tramo que queda entero fuera (de 00:00 a
 * 06:00 con la rejilla empezando a las 08:00) no se pinta.
 *
 * @param blocks — tramos de bloqueo de la semana (ya troceados por día).
 * @param hours — horas visibles (de `getHoursRange`).
 */
export function groupScheduleBlocksByWeekday(
  blocks: PanelScheduleBlock[],
  hours: number[],
): Record<WeekdayKey, PositionedScheduleBlock[]> {
  const grouped: Record<WeekdayKey, PositionedScheduleBlock[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };
  if (hours.length === 0) return grouped;

  const visibleStartMin = hours[0] * 60;
  const visibleEndMin = (hours[hours.length - 1] + 1) * 60;

  for (const block of blocks) {
    const key = WEEKDAY_KEYS[block.weekday];
    if (!key) continue;
    const { startMin, endMin } = getMinutesSpan(block);
    const clippedStart = Math.max(startMin, visibleStartMin);
    const clippedEnd = Math.min(endMin, visibleEndMin);
    if (clippedEnd <= clippedStart) continue;

    grouped[key].push({
      block,
      topPx: ((clippedStart - visibleStartMin) / 60) * HOUR_HEIGHT_PX,
      heightPx: Math.max(((clippedEnd - clippedStart) / 60) * HOUR_HEIGHT_PX, MIN_BLOCK_HEIGHT_PX),
    });
  }

  for (const key of WEEKDAY_KEYS) {
    grouped[key].sort((a, b) => a.topPx - b.topPx);
  }
  return grouped;
}
