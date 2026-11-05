'use client';

import { useClerk } from '@clerk/nextjs';
import { useCallback, useState } from 'react';

import { deleteAccountAction } from '@/app/[locale]/cuenta/account-data.actions';

import type { AccountDataErrorCode } from './AccountDataCard.types';

/**
 * Estado de la eliminación de cuenta: pedir confirmación, llamar al servidor
 * y salir de la sesión.
 *
 * @param locale — idioma al que se vuelve al terminar.
 */
export function useAccountDataCard(locale: string) {
  const { signOut } = useClerk();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorCode, setErrorCode] = useState<AccountDataErrorCode | null>(null);

  const askConfirmation = useCallback(() => {
    setErrorCode(null);
    setIsConfirming(true);
  }, []);

  const cancel = useCallback(() => setIsConfirming(false), []);

  const confirmDeletion = useCallback(async () => {
    const home = `/${locale}`;
    setIsDeleting(true);
    setErrorCode(null);
    const result = await deleteAccountAction().catch(() => null);
    if (!result || !result.ok) {
      setErrorCode(result ? result.code : 'internal');
      setIsDeleting(false);
      setIsConfirming(false);
      return;
    }
    // La cuenta ya no existe: si cerrar la sesión falla, basta con salir.
    await signOut({ redirectUrl: home }).catch(() => window.location.assign(home));
  }, [locale, signOut]);

  return { isConfirming, isDeleting, errorCode, askConfirmation, cancel, confirmDeletion };
}
