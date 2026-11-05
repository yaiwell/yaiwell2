'use server';

import { auth } from '@clerk/nextjs/server';

import { AccountDeletionBlockedError, deleteOwnAccount } from '@/lib/services/account';
import type { AccountDeletionBlockReason } from '@/lib/services/account';

/** Resultado serializable de `deleteAccountAction`. */
export type DeleteAccountState =
  | { ok: true }
  | { ok: false; code: AccountDeletionBlockReason | 'unauthenticated' | 'internal' };

/**
 * Elimina la cuenta de la sesión actual. No recibe ningún id: nadie puede
 * eliminar una cuenta que no sea la suya.
 */
export async function deleteAccountAction(): Promise<DeleteAccountState> {
  const { userId } = await auth();
  if (!userId) return { ok: false, code: 'unauthenticated' };

  try {
    await deleteOwnAccount(userId);
    return { ok: true };
  } catch (error) {
    if (error instanceof AccountDeletionBlockedError) return { ok: false, code: error.reason };
    console.error('[cuenta/account-data] delete failed:', error);
    return { ok: false, code: 'internal' };
  }
}
