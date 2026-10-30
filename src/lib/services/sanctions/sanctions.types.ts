/**
 * Tipos del dominio de sanciones a clientes (no presentados en reservas
 * con pago en el local, CLAUDE.md §4.bis).
 */

/** Motivos de sanción. Hoy solo uno (CHECK en BD, migración 9f). */
export type SanctionReason = 'no_show';

/**
 * Si el cliente puede reservar pagando en el local.
 *
 * - `allowed: true`: sin bloqueo vigente.
 * - `allowed: false`: bloqueado hasta `restrictedUntil` (exclusivo).
 *
 * `sanctionsInWindow` es el «n de 3 en 12 meses» que se cuenta al
 * cliente en el aviso de no presentado.
 */
export type ClientOnsiteEligibility =
  | { allowed: true; restrictedUntil: null; sanctionsInWindow: number }
  | { allowed: false; restrictedUntil: Date; sanctionsInWindow: number };

/** Sanción vigente tal como la lista soporte en /admin. */
export interface ActiveSanctionSummary {
  id: string;
  bookingId: string;
  reason: SanctionReason;
  occurredAt: Date;
  createdAt: Date;
}

/** Resultado de revocar una sanción desde soporte. */
export interface RevokeSanctionResult {
  sanctionId: string;
  userId: string;
  revokedAt: Date;
}
