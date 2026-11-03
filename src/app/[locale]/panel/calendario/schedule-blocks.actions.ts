'use server';

import { revalidatePath } from 'next/cache';
import { hasLocale } from 'next-intl';

import { routing, type AppLocale } from '@/i18n/routing';
import { pickLocalized, toIntlLocale } from '@/lib/i18n';
import {
  ScheduleBlockConflictError,
  ScheduleBlockEndBeforeStartError,
  ScheduleBlockInPastError,
  ScheduleBlockInvalidInputError,
  ScheduleBlockNotFoundError,
  ScheduleBlockTooFarError,
  ScheduleBlockTooLongError,
  createScheduleBlock,
  createScheduleBlockSchema,
  removeScheduleBlock,
  scheduleBlockIdSchema,
  type CreateScheduleBlockInput,
  type ScheduleBlockConflict,
  type ScheduleBlockErrorCode,
} from '@/lib/services/schedule-blocks';
import { PANEL_TIMEZONE } from '@/lib/utils/madrid-week';

import { resolveProviderOwner, type ProviderOwner } from './provider-owner';

/** Cita que impide bloquear, ya formateada para el panel. */
export type ScheduleBlockConflictView = {
  bookingId: string;
  /** Día en hora de Madrid, en el idioma del panel. */
  dateLabel: string;
  /** Hora de inicio `HH:mm` en Madrid. */
  timeLabel: string;
  clientName: string | null;
  /** Nombre del servicio ya localizado. */
  serviceName: string;
};

/** Resultado serializable de las actions de bloqueos de agenda. */
export type ScheduleBlockActionResult =
  | { ok: true }
  | { ok: false; code: ScheduleBlockErrorCode; conflicts?: ScheduleBlockConflictView[] };

/** Errores tipados del dominio y su código opaco. */
const ERROR_CODES: ReadonlyArray<[new (...args: never[]) => Error, ScheduleBlockErrorCode]> = [
  [ScheduleBlockInvalidInputError, 'INVALID_INPUT'],
  [ScheduleBlockEndBeforeStartError, 'END_BEFORE_START'],
  [ScheduleBlockInPastError, 'IN_PAST'],
  [ScheduleBlockTooLongError, 'TOO_LONG'],
  [ScheduleBlockTooFarError, 'TOO_FAR'],
  [ScheduleBlockConflictError, 'CONFLICT'],
  [ScheduleBlockNotFoundError, 'NOT_FOUND'],
];

/** Formatea las citas en conflicto en hora de Madrid y en el idioma del panel. */
function toConflictViews(
  conflicts: ScheduleBlockConflict[],
  locale: AppLocale,
): ScheduleBlockConflictView[] {
  const intlLocale = toIntlLocale(locale);
  const dateFormat = new Intl.DateTimeFormat(intlLocale, {
    timeZone: PANEL_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeFormat = new Intl.DateTimeFormat(intlLocale, {
    timeZone: PANEL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return conflicts.map((conflict) => ({
    bookingId: conflict.bookingId,
    dateLabel: dateFormat.format(conflict.startAt),
    timeLabel: timeFormat.format(conflict.startAt),
    clientName: conflict.clientName,
    serviceName: pickLocalized(conflict.serviceName, locale),
  }));
}

/**
 * Esqueleto común: valida el locale, resuelve al dueño autenticado,
 * ejecuta la operación y revalida el calendario si sale bien. Nunca
 * viajan mensajes internos ni de Prisma: solo códigos opacos.
 */
async function runScheduleBlockAction(
  locale: string,
  actionName: string,
  operation: (owner: ProviderOwner) => Promise<unknown>,
): Promise<ScheduleBlockActionResult> {
  if (!hasLocale(routing.locales, locale)) {
    return { ok: false, code: 'INVALID_INPUT' };
  }
  const owner = await resolveProviderOwner(locale);
  if (!owner) {
    return { ok: false, code: 'FORBIDDEN' };
  }

  try {
    await operation(owner);
  } catch (err) {
    if (err instanceof ScheduleBlockConflictError) {
      return { ok: false, code: 'CONFLICT', conflicts: toConflictViews(err.conflicts, locale) };
    }
    const match = ERROR_CODES.find(([ErrorClass]) => err instanceof ErrorClass);
    if (match) return { ok: false, code: match[1] };
    // Solo lo inesperado va al log: los errores de regla son respuestas
    // legítimas del formulario, no incidencias.
    console.error(`[panel/calendario] ${actionName} error:`, err);
    return { ok: false, code: 'INTERNAL' };
  }

  revalidatePath(`/${locale}/panel/calendario`);
  return { ok: true };
}

/**
 * Bloquea un rango de la agenda del negocio de la sesión.
 *
 * El `providerId` y el autor salen de la sesión, nunca del cliente. Si
 * el rango pisa citas activas, devuelve `CONFLICT` con la lista para que
 * el dueño las mueva o cancele antes.
 */
export async function createScheduleBlockAction(
  locale: AppLocale,
  input: CreateScheduleBlockInput,
): Promise<ScheduleBlockActionResult> {
  // Validamos la forma en el borde: lo que llega de una server action es
  // un payload arbitrario aunque TypeScript diga otra cosa.
  const parsed = createScheduleBlockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'INVALID_INPUT' };

  return runScheduleBlockAction(locale, 'createScheduleBlockAction', (owner) =>
    createScheduleBlock(parsed.data, { providerId: owner.providerId, userId: owner.userId }),
  );
}

/** Quita un bloqueo del negocio de la sesión. Idempotente. */
export async function removeScheduleBlockAction(
  locale: AppLocale,
  blockId: string,
): Promise<ScheduleBlockActionResult> {
  const parsed = scheduleBlockIdSchema.safeParse(blockId);
  if (!parsed.success) return { ok: false, code: 'INVALID_INPUT' };

  return runScheduleBlockAction(locale, 'removeScheduleBlockAction', (owner) =>
    removeScheduleBlock(parsed.data, { providerId: owner.providerId, userId: owner.userId }),
  );
}
