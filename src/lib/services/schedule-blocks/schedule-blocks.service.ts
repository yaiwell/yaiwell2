/**
 * Servicio de bloqueos puntuales de agenda.
 *
 * Un bloqueo es un rango en el que el profesional no atiende (médico,
 * vacaciones, una tarde libre). El motor de disponibilidad lo trata como
 * una ocupación más; aquí viven las reglas para crearlo y quitarlo:
 *  - No puede pisar reservas activas: el dueño debe moverlas o
 *    cancelarlas antes (así nunca se deja a un cliente plantado en
 *    silencio).
 *  - Las ofertas de hueco que solapen se retiran en la misma transacción.
 *  - Máx. 60 días, empieza como mucho a un año vista y nunca en el pasado
 *    (se admite «desde ya», redondeado a 5 minutos).
 *  - Pueden solaparse entre sí; quitar es un borrado suave; no se editan.
 */
import { prisma } from '@/lib/db/prisma';
import { availabilityRepository } from '@/lib/services/availability/availability.repository';
// Ruta directa: el barrel de `booking` arrastra `slot-offers`, que a su
// vez usa el repositorio de este dominio.
import { bookingRepository } from '@/lib/services/booking/booking.repository';
import { madridLocalToUtc } from '@/lib/utils/madrid-week';
import type { LocalizedText } from '@/types/domain';

import {
  SCHEDULE_BLOCK_MAX_DAYS,
  SCHEDULE_BLOCK_MAX_LEAD_DAYS,
  SCHEDULE_BLOCK_STEP_MINUTES,
} from './schedule-blocks.constants';
import {
  ScheduleBlockConflictError,
  ScheduleBlockEndBeforeStartError,
  ScheduleBlockInPastError,
  ScheduleBlockInvalidInputError,
  ScheduleBlockNoProfessionalError,
  ScheduleBlockNotFoundError,
  ScheduleBlockTooFarError,
  ScheduleBlockTooLongError,
} from './schedule-blocks.errors';
import { scheduleBlocksRepository } from './schedule-blocks.repository';
import type { CreateScheduleBlockInput, ScheduleBlockContext } from './schedule-blocks.types';
import { createScheduleBlockSchema, scheduleBlockIdSchema } from './schedule-blocks.validation';

const DAY_MS = 24 * 60 * 60 * 1000;
const STEP_MS = SCHEDULE_BLOCK_STEP_MINUTES * 60 * 1000;

/**
 * Convierte la entrada (hora de Madrid) a instantes y aplica las reglas
 * que dependen del reloj.
 */
function resolveRange(input: CreateScheduleBlockInput, now: Date) {
  const parsed = createScheduleBlockSchema.safeParse(input);
  if (!parsed.success) throw new ScheduleBlockInvalidInputError();
  const data = parsed.data;

  const startAt = madridLocalToUtc(data.startDateKey, data.startTime);
  const endAt = madridLocalToUtc(data.endDateKey, data.endTime);

  if (endAt.getTime() <= startAt.getTime()) throw new ScheduleBlockEndBeforeStartError();
  // «Desde ya»: el selector ofrece la hora actual redondeada hacia abajo
  // a 5 minutos, que puede quedar unos minutos por detrás de `now`.
  const earliestStart = Math.floor(now.getTime() / STEP_MS) * STEP_MS;
  if (startAt.getTime() < earliestStart) throw new ScheduleBlockInPastError();
  if (startAt.getTime() > now.getTime() + SCHEDULE_BLOCK_MAX_LEAD_DAYS * DAY_MS) {
    throw new ScheduleBlockTooFarError();
  }
  if (endAt.getTime() - startAt.getTime() > SCHEDULE_BLOCK_MAX_DAYS * DAY_MS) {
    throw new ScheduleBlockTooLongError();
  }
  return { startAt, endAt, reason: data.reason ?? null };
}

/**
 * Crea un bloqueo de agenda para el profesional del negocio.
 *
 * Todo ocurre en una transacción bajo el MISMO bloqueo por profesional
 * que toma `createBooking`: sin él, una reserva podía colarse entre la
 * comprobación de conflictos y la escritura del bloqueo.
 *
 * Hoy hay un profesional por negocio; el bloqueo se liga a él para que
 * el multi-profesional no exija migrar datos.
 *
 * @param input — fecha y hora de inicio y fin en hora de Madrid.
 * @param ctx — negocio y usuario de la sesión.
 * @returns el id del bloqueo creado.
 * @throws ScheduleBlockInvalidInputError, ScheduleBlockEndBeforeStartError,
 *   ScheduleBlockInPastError, ScheduleBlockTooFarError,
 *   ScheduleBlockTooLongError, ScheduleBlockConflictError,
 *   ScheduleBlockNoProfessionalError.
 */
export async function createScheduleBlock(
  input: CreateScheduleBlockInput,
  ctx: ScheduleBlockContext,
): Promise<{ id: string }> {
  const now = ctx.now ?? new Date();
  const { startAt, endAt, reason } = resolveRange(input, now);

  const professionalId = await availabilityRepository.findFirstProfessionalIdForProvider(
    ctx.providerId,
  );
  if (!professionalId) throw new ScheduleBlockNoProfessionalError();

  return prisma.$transaction(async (tx) => {
    await bookingRepository.lockProfessional(tx, professionalId);

    const conflicts = await scheduleBlocksRepository.findConflictingBookings(
      tx,
      professionalId,
      startAt,
      endAt,
      now,
    );
    if (conflicts.length > 0) {
      throw new ScheduleBlockConflictError(
        conflicts.map((booking) => ({
          bookingId: booking.id,
          startAt: booking.startAt,
          clientName: booking.client.fullName ?? null,
          serviceName: booking.service.name as unknown as LocalizedText,
        })),
      );
    }

    await scheduleBlocksRepository.withdrawOverlappingOffers(
      tx,
      professionalId,
      startAt,
      endAt,
      now,
    );
    return scheduleBlocksRepository.create(tx, {
      providerId: ctx.providerId,
      professionalId,
      startAt,
      endAt,
      reason,
      createdBy: ctx.userId,
    });
  });
}

/**
 * Quita un bloqueo (borrado suave con autor). Idempotente: quitar uno ya
 * quitado no falla, para que un doble clic no enseñe un error.
 *
 * Un bloqueo de otro negocio responde igual que uno inexistente, para no
 * revelar ids ajenos.
 *
 * @throws ScheduleBlockNotFoundError si no existe o no es del negocio.
 */
export async function removeScheduleBlock(
  blockId: string,
  ctx: ScheduleBlockContext,
): Promise<void> {
  const parsedId = scheduleBlockIdSchema.safeParse(blockId);
  if (!parsedId.success) throw new ScheduleBlockNotFoundError();

  const block = await scheduleBlocksRepository.findById(parsedId.data);
  if (!block || block.providerId !== ctx.providerId) throw new ScheduleBlockNotFoundError();
  if (block.deletedAt) return;

  await scheduleBlocksRepository.softDelete(block.id, ctx.userId, ctx.now ?? new Date());
}
