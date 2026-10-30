'use client';

import { useCallback, useId, useState, useTransition, type FormEvent } from 'react';

// `sanctions.validation` (más abajo) va por import directo: solo Zod y
// client-safe; el barrel de sanciones arrastra Prisma.
import {
  revokeSanctionAction,
  type RevokeSanctionErrorCode,
} from '@/app/[locale]/admin/sanciones/actions';
import type { AppLocale } from '@/i18n/routing';
import {
  REVOKE_REASON_MAX_LENGTH,
  REVOKE_REASON_MIN_LENGTH,
} from '@/lib/services/sanctions/sanctions.validation';

/**
 * Comprobación en cliente del motivo con los mismos límites que el
 * schema Zod del servidor. Solo es UX: la action lo vuelve a validar.
 */
export function isRevokeReasonValid(reason: string): boolean {
  const length = reason.trim().length;
  return length >= REVOKE_REASON_MIN_LENGTH && length <= REVOKE_REASON_MAX_LENGTH;
}

/**
 * Hook de la revocación de una sanción: abre el formulario, valida el
 * motivo y llama a la action. Al revalidar, la fila desaparece de la lista.
 */
export function useRevokeSanction(sanctionId: string, locale: AppLocale) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [showReasonError, setShowReasonError] = useState(false);
  const [errorCode, setErrorCode] = useState<RevokeSanctionErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();
  const idBase = useId();

  const open = useCallback(() => setIsOpen(true), []);

  const cancel = useCallback(() => {
    setIsOpen(false);
    setReason('');
    setShowReasonError(false);
    setErrorCode(null);
  }, []);

  const changeReason = useCallback((value: string) => {
    setReason(value);
    if (isRevokeReasonValid(value)) setShowReasonError(false);
  }, []);

  const submit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isRevokeReasonValid(reason)) {
        setShowReasonError(true);
        return;
      }
      setErrorCode(null);
      startTransition(async () => {
        try {
          const state = await revokeSanctionAction(locale, sanctionId, reason);
          if (state.ok) return;
          if (state.code === 'INVALID_REASON') setShowReasonError(true);
          else setErrorCode(state.code);
        } catch {
          setErrorCode('INTERNAL');
        }
      });
    },
    [locale, sanctionId, reason],
  );

  return {
    isOpen,
    reason,
    showReasonError,
    errorCode,
    isPending,
    ids: { reason: `${idBase}-reason`, hint: `${idBase}-hint`, error: `${idBase}-error` },
    open,
    cancel,
    changeReason,
    submit,
  };
}
