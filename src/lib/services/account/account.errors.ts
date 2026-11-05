/**
 * Errores tipados de la gestión de datos de la cuenta.
 */

/** Motivo por el que la cuenta no se puede eliminar por autoservicio. */
export type AccountDeletionBlockReason = 'admin' | 'provider' | 'open_bookings' | 'open_refunds';

/**
 * La cuenta no se puede eliminar todavía: administra un negocio, es de
 * administración, o tiene reservas o reembolsos sin cerrar.
 */
export class AccountDeletionBlockedError extends Error {
  readonly code = 'ACCOUNT_DELETION_BLOCKED';

  constructor(readonly reason: AccountDeletionBlockReason) {
    super(`Account deletion blocked: ${reason}.`);
    this.name = 'AccountDeletionBlockedError';
  }
}
