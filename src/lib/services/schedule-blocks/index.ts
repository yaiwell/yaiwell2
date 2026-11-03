/**
 * API pública del dominio de bloqueos de agenda.
 *
 * Solo servidor: arrastra Prisma. Los Client Components importan tipos
 * (se borran al compilar) o las constantes de `schedule-blocks.constants`
 * por ruta directa.
 *
 * Desde `availability`, `booking`, `slot-offers` y `checkout` se importa
 * `schedule-blocks.repository` por ruta directa, no este barrel, para no
 * cerrar ciclos (el servicio usa `booking` y `availability`).
 */
export { createScheduleBlock, removeScheduleBlock } from './schedule-blocks.service';
export { scheduleBlocksRepository } from './schedule-blocks.repository';
export {
  ScheduleBlockConflictError,
  ScheduleBlockEndBeforeStartError,
  ScheduleBlockInPastError,
  ScheduleBlockInvalidInputError,
  ScheduleBlockNoProfessionalError,
  ScheduleBlockNotFoundError,
  ScheduleBlockTooFarError,
  ScheduleBlockTooLongError,
} from './schedule-blocks.errors';
export {
  SCHEDULE_BLOCK_MAX_DAYS,
  SCHEDULE_BLOCK_MAX_LEAD_DAYS,
  SCHEDULE_BLOCK_REASON_MAX_LENGTH,
  SCHEDULE_BLOCK_STEP_MINUTES,
} from './schedule-blocks.constants';
export { createScheduleBlockSchema, scheduleBlockIdSchema } from './schedule-blocks.validation';
export type {
  CreateScheduleBlockInput,
  ScheduleBlockConflict,
  ScheduleBlockContext,
  ScheduleBlockErrorCode,
  ScheduleBlockSpan,
  ScheduleBlockSummary,
} from './schedule-blocks.types';
