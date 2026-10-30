/**
 * Servicio de sanciones a clientes (CLAUDE.md §4.bis).
 *
 * Decide si un cliente puede pagar en el local y permite a soporte
 * revocar sanciones. Marcar y deshacer «no presentado» vive en el
 * dominio booking (`booking.no-show.service.ts`), que escribe la sanción
 * en su misma transacción con este repositorio.
 */

import {
  SANCTION_LOOKBACK_MONTHS,
  addMonthsUtc,
  computeOnlineOnlyUntil,
  countSanctionsInWindow,
} from './sanctions.calc';
import { SanctionAlreadyRevokedError, SanctionNotFoundError } from './sanctions.errors';
import { sanctionsRepository } from './sanctions.repository';
import type {
  ActiveSanctionSummary,
  ClientOnsiteEligibility,
  RevokeSanctionResult,
  SanctionReason,
} from './sanctions.types';
import { revokeSanctionSchema } from './sanctions.validation';

/**
 * Si el cliente puede reservar pagando en el local en `now`.
 *
 * Solo lee lo que puede influir en un bloqueo vigente (15 meses atrás):
 * el bloqueo se recalcula siempre, nunca se guarda.
 *
 * @param userId — `User.id` interno del cliente.
 * @param now — instante de referencia; inyectable para tests.
 */
export async function getClientOnsiteEligibility(
  userId: string,
  now: Date = new Date(),
): Promise<ClientOnsiteEligibility> {
  const since = addMonthsUtc(now, -SANCTION_LOOKBACK_MONTHS);
  const sanctions = await sanctionsRepository.findActiveSince(userId, since);
  const sanctionsInWindow = countSanctionsInWindow(sanctions, now);
  const restrictedUntil = computeOnlineOnlyUntil(sanctions, now);
  return restrictedUntil
    ? { allowed: false, restrictedUntil, sanctionsInWindow }
    : { allowed: true, restrictedUntil: null, sanctionsInWindow };
}

/**
 * Sanciones vigentes de un cliente, de la más reciente a la más antigua.
 * Para soporte (/admin): la autorización la hace el borde.
 *
 * @param userId — `User.id` interno del cliente.
 */
export async function listActiveSanctions(userId: string): Promise<ActiveSanctionSummary[]> {
  const rows = await sanctionsRepository.listActive(userId);
  return rows.map((row) => ({ ...row, reason: row.reason as SanctionReason }));
}

/**
 * Revoca una sanción desde soporte. Pasadas las 24 h en que el negocio
 * puede deshacer el no presentado, es el único camino. La reserva sigue
 * `no_show`: soporte corrige el castigo, no reescribe lo ocurrido.
 *
 * Al recalcularse siempre, revocar una sanción levanta en el acto el
 * bloqueo que provocaba (si ya no quedan tres en 12 meses).
 *
 * @param input — `{ sanctionId, reason }` crudo (validado con Zod).
 * @param adminUserId — `User.id` del admin autenticado (rol comprobado en el borde).
 * @param now — instante de la revocación; inyectable para tests.
 * @throws SanctionNotFoundError — no existe.
 * @throws SanctionAlreadyRevokedError — ya estaba revocada.
 */
export async function revokeSanction(
  input: unknown,
  adminUserId: string,
  now: Date = new Date(),
): Promise<RevokeSanctionResult> {
  const { sanctionId, reason } = revokeSanctionSchema.parse(input);

  const sanction = await sanctionsRepository.findById(sanctionId);
  if (!sanction) throw new SanctionNotFoundError();
  if (sanction.revokedAt) throw new SanctionAlreadyRevokedError();

  // Condicional a `revokedAt IS NULL`: si el negocio la deshizo entre la
  // lectura y aquí, no pisamos su revocación.
  const changed = await sanctionsRepository.revokeById(sanctionId, {
    revokedAt: now,
    revokedBy: adminUserId,
    revokeReason: reason,
  });
  if (changed === 0) throw new SanctionAlreadyRevokedError();

  return { sanctionId, userId: sanction.userId, revokedAt: now };
}
