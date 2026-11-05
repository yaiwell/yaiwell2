/**
 * API pública de la gestión de datos de la cuenta (RGPD).
 */
export { buildAccountExport, deleteOwnAccount, updateAccountLocale } from './account.service';
export { AccountDeletionBlockedError } from './account.errors';
export type { AccountDeletionBlockReason } from './account.errors';
export type { AccountExport } from './account.types';
