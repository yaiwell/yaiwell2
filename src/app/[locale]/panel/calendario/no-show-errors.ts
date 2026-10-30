import { ZodError } from 'zod';

import {
  BookingNotConfirmedError,
  BookingNotFoundError,
  BookingNotNoShowError,
  BookingNotStartedError,
  NoShowUndoWindowClosedError,
  NoShowWindowClosedError,
  SlotUnavailableError,
  UnauthorizedCancellationError,
} from '@/lib/services/booking';

/**
 * Códigos de las acciones «No se presentó» y «Deshacer» del panel.
 *
 * Va fuera de `actions.ts` porque un fichero `'use server'` solo puede
 * exportar acciones, y el mapeo se prueba por separado.
 */
export type NoShowActionErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'NOT_CONFIRMED'
  | 'NOT_STARTED'
  | 'WINDOW_CLOSED'
  | 'NOT_NO_SHOW'
  | 'UNDO_WINDOW_CLOSED'
  | 'SLOT_TAKEN'
  | 'INTERNAL';

/** Resultado serializable de `markNoShowAction` / `undoNoShowAction`. */
export type NoShowActionState = { ok: true } | { ok: false; code: NoShowActionErrorCode };

/**
 * Traduce los errores tipados del dominio a códigos opacos. Solo lo
 * inesperado va al log: el resto son respuestas legítimas.
 *
 * @param err — error lanzado por `markBookingNoShow` / `undoBookingNoShow`.
 * @param action — nombre de la acción, para el log.
 */
export function toNoShowActionCode(
  err: unknown,
  action: string,
): Extract<NoShowActionState, { ok: false }> {
  const code = mapError(err);
  if (code === 'INTERNAL') console.error(`[panel/calendario] ${action} error:`, err);
  return { ok: false, code };
}

function mapError(err: unknown): NoShowActionErrorCode {
  if (err instanceof ZodError || err instanceof BookingNotFoundError) return 'NOT_FOUND';
  if (err instanceof UnauthorizedCancellationError) return 'FORBIDDEN';
  if (err instanceof BookingNotConfirmedError) return 'NOT_CONFIRMED';
  if (err instanceof BookingNotStartedError) return 'NOT_STARTED';
  if (err instanceof NoShowWindowClosedError) return 'WINDOW_CLOSED';
  if (err instanceof BookingNotNoShowError) return 'NOT_NO_SHOW';
  if (err instanceof NoShowUndoWindowClosedError) return 'UNDO_WINDOW_CLOSED';
  if (err instanceof SlotUnavailableError) return 'SLOT_TAKEN';
  return 'INTERNAL';
}
