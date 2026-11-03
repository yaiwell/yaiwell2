import { ZodError } from 'zod';

import {
  LastActiveProfessionalError,
  PlanProfessionalLimitError,
  ProfessionalHasFutureBookingsError,
  ProfessionalInactiveError,
  ProfessionalNotFoundError,
  ProfessionalPhotoInvalidError,
  ServicesWouldBeUnstaffedError,
  TeamProviderNotFoundError,
  TeamServicesInvalidError,
} from '@/lib/services/team';
import type { LocalizedText } from '@/types/domain';

/**
 * Resultado serializable de las acciones del equipo y mapeo de errores
 * del dominio a códigos opacos. Vive fuera de `actions.ts` porque un
 * fichero `'use server'` solo puede exportar funciones async.
 */

/** Cita futura que impide la baja, lista para cruzar la frontera RSC. */
export interface BlockingBookingDto {
  id: string;
  /** ISO 8601. */
  startAt: string;
  serviceName: LocalizedText;
}

export type TeamActionErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'PHOTO_INVALID'
  | 'SERVICES_INVALID'
  | 'PLAN_LIMIT'
  | 'HAS_FUTURE_BOOKINGS'
  | 'LAST_ACTIVE'
  | 'UNSTAFFED_SERVICES'
  | 'INTERNAL';

export type TeamActionState =
  | { ok: true }
  | {
      ok: false;
      code: TeamActionErrorCode;
      /** Solo con `HAS_FUTURE_BOOKINGS`. */
      bookings?: BlockingBookingDto[];
      /** Solo con `UNSTAFFED_SERVICES`: servicios que se quedarían sin nadie. */
      services?: { id: string; name: LocalizedText }[];
    };

type Failure = Extract<TeamActionState, { ok: false }>;

/**
 * Traduce un error del dominio `team` a un código estable. Los
 * desconocidos se registran y salen como `INTERNAL`.
 *
 * @param scope — etiqueta del log (`create`, `update`…).
 */
export function teamFailure(err: unknown, scope: string): Failure {
  if (err instanceof ZodError) return { ok: false, code: 'VALIDATION' };
  // Un id de otro negocio se comporta igual que uno inexistente.
  if (err instanceof ProfessionalNotFoundError || err instanceof TeamProviderNotFoundError) {
    return { ok: false, code: 'NOT_FOUND' };
  }
  if (err instanceof ProfessionalInactiveError) return { ok: false, code: 'INACTIVE' };
  if (err instanceof ProfessionalPhotoInvalidError) return { ok: false, code: 'PHOTO_INVALID' };
  if (err instanceof TeamServicesInvalidError) return { ok: false, code: 'SERVICES_INVALID' };
  if (err instanceof PlanProfessionalLimitError) return { ok: false, code: 'PLAN_LIMIT' };
  if (err instanceof LastActiveProfessionalError) return { ok: false, code: 'LAST_ACTIVE' };
  if (err instanceof ProfessionalHasFutureBookingsError) {
    return {
      ok: false,
      code: 'HAS_FUTURE_BOOKINGS',
      bookings: err.bookings.map((b) => ({
        id: b.id,
        startAt: b.startAt.toISOString(),
        serviceName: b.serviceName,
      })),
    };
  }
  if (err instanceof ServicesWouldBeUnstaffedError) {
    return { ok: false, code: 'UNSTAFFED_SERVICES', services: err.services };
  }
  console.error(`[panel/equipo] ${scope} error:`, err);
  return { ok: false, code: 'INTERNAL' };
}
