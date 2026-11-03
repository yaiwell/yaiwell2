import 'server-only';

import type { PanelScheduleBlock } from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';
import { scheduleBlocksRepository } from '@/lib/services/schedule-blocks';
import { getMadridDayRange, getMadridWeekRange, getWeekDateKeys } from '@/lib/utils/madrid-week';

import { timeInMadrid, type PanelWeekday } from './panel-madrid-time';
import { filterByProfessional } from './panel-professional-filter';

/** Bloqueo tal y como lo devuelve el repositorio del dominio. */
interface ScheduleBlockRecord {
  id: string;
  professionalId?: string | null;
  startAt: Date;
  endAt: Date;
  reason: string | null;
}

/**
 * Trocea un bloqueo en un tramo por cada día civil de Madrid de la
 * semana que toca.
 *
 * Se corta por los rangos reales de cada día (`getMadridDayRange`), no
 * sumando 24 h: así los días de cambio de hora (23 o 25 h) quedan bien
 * y un bloqueo de varios días no se desplaza una hora a mitad de semana.
 * Un tramo que acaba en la medianoche siguiente se marca `24:00` para
 * que la rejilla lo lleve hasta el final de su columna.
 *
 * @param block — bloqueo completo (puede empezar o acabar fuera de la semana).
 * @param dateKeys — los 7 días (`YYYY-MM-DD`) de la semana, de lunes a domingo.
 * @param professionalName — nombre del profesional bloqueado, si se conoce.
 */
export function splitScheduleBlockByMadridDay(
  block: ScheduleBlockRecord,
  dateKeys: string[],
  professionalName: string | null = null,
): PanelScheduleBlock[] {
  const segments: PanelScheduleBlock[] = [];

  dateKeys.forEach((dateKey, index) => {
    const day = getMadridDayRange(dateKey);
    const start = block.startAt > day.start ? block.startAt : day.start;
    const end = block.endAt < day.end ? block.endAt : day.end;
    if (end <= start) return;

    const startsAtMidnight = start.getTime() === day.start.getTime();
    const endsAtMidnight = end.getTime() === day.end.getTime();
    segments.push({
      id: block.id,
      segmentKey: `${block.id}:${dateKey}`,
      weekday: index as PanelWeekday,
      startTime: startsAtMidnight ? '00:00' : timeInMadrid(start),
      endTime: endsAtMidnight ? '24:00' : timeInMadrid(end),
      reason: block.reason,
      professionalId: block.professionalId ?? null,
      professionalName,
      startAtIso: block.startAt.toISOString(),
      endAtIso: block.endAt.toISOString(),
      isFullDay: startsAtMidnight && endsAtMidnight,
    });
  });

  return segments;
}

/**
 * Bloqueos puntuales de agenda de una semana de Madrid, troceados por
 * día para pintarlos en `/panel/calendario`.
 *
 * El motivo viaja tal cual porque solo lo ve el propio negocio: esta
 * función solo se llama con el Provider del usuario autenticado.
 *
 * @param providerId — Provider del usuario autenticado.
 * @param weekStartKey — lunes de la semana (`YYYY-MM-DD`).
 * @param professionalId — filtro `?pro=` ya validado; `null` = todos.
 * @returns un tramo por bloqueo y día, en el orden del repositorio.
 */
export async function getPanelWeekScheduleBlocks(
  providerId: string,
  weekStartKey: string,
  professionalId: string | null = null,
): Promise<PanelScheduleBlock[]> {
  const { start, end } = getMadridWeekRange(weekStartKey);
  const found = await scheduleBlocksRepository.findForProviderRange(providerId, start, end);
  const blocks = filterByProfessional(found, professionalId);
  if (blocks.length === 0) return [];

  // El nombre sale del equipo activo: el bloqueo de alguien ya de baja
  // se sigue pintando, sin nombre.
  const team = await scheduleBlocksRepository.findActiveProfessionals(providerId);
  const names = new Map(team.map((member) => [member.id, member.name]));
  const dateKeys = getWeekDateKeys(weekStartKey);
  return blocks.flatMap((block) =>
    splitScheduleBlockByMadridDay(block, dateKeys, names.get(block.professionalId) ?? null),
  );
}
