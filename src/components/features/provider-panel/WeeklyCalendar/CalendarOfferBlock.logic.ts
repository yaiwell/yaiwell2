'use client';

import { useState, useTransition } from 'react';

import {
  withdrawSlotOfferAction,
  type SlotOfferActionCode,
} from '@/app/[locale]/panel/calendario/slot-offers.actions';

import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';

/** Errores de retirar una oferta que sabemos contar al profesional. */
export type WithdrawErrorKey = 'notFound' | 'forbidden' | 'internal';

/** Código de la action → clave i18n de `slotOffers.withdraw.errors`. */
export function toWithdrawErrorKey(code: SlotOfferActionCode): WithdrawErrorKey {
  if (code === 'NOT_FOUND') return 'notFound';
  if (code === 'FORBIDDEN') return 'forbidden';
  return 'internal';
}

/**
 * Retira una oferta de hueco liberado. Si sale bien, `revalidatePath`
 * re-renderiza el calendario y el bloque desaparece: esa es la
 * confirmación (el hueco vuelve a su precio normal).
 */
export function useWithdrawOffer(locale: SupportedLocale, offerId: string) {
  const [errorKey, setErrorKey] = useState<WithdrawErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  function withdraw() {
    setErrorKey(null);
    startTransition(async () => {
      const result = await withdrawSlotOfferAction(locale, offerId);
      if (!result.ok) setErrorKey(toWithdrawErrorKey(result.code));
    });
  }

  return { withdraw, isPending, errorKey };
}
