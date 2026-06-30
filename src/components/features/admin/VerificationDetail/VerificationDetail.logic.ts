'use client';

import { useCallback, useState, useTransition } from 'react';

import {
  approveProviderAction,
  rejectProviderAction,
  type VerificationActionState,
} from '@/app/[locale]/admin/verificaciones/actions';
import type { AppLocale } from '@/i18n/routing';

import type { ModerationError } from './VerificationDetail.types';

/**
 * Hook que orquesta las acciones de moderación con server actions reales.
 *
 * Estado:
 *  - `isPending`: `true` mientras una acción está en curso. Deshabilita
 *    ambos botones para evitar doble disparo.
 *  - `rejectOpen`: si el AlertDialog de rechazo está abierto.
 *  - `rejectNotes`: textarea controlado para el motivo (mín 5 chars).
 *  - `error`: código del último fallo (null si todo OK o aún sin actuar).
 *
 * Tras un `ok: true` la action hace `redirect` interno, así que nunca
 * llegamos a ese caso aquí — sí lo manejamos en el `if (state.ok)`
 * defensivo por si la firma cambia en futuro.
 */
export function useVerificationModeration(providerId: string, locale: AppLocale) {
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [error, setError] = useState<ModerationError>(null);

  const approve = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const state: VerificationActionState = await approveProviderAction(locale, providerId);
      if (!state.ok) setError(state.code);
    });
  }, [providerId, locale]);

  const openRejectDialog = useCallback(() => {
    setError(null);
    setRejectNotes('');
    setRejectOpen(true);
  }, []);

  const closeRejectDialog = useCallback(() => {
    setRejectOpen(false);
  }, []);

  const submitReject = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const state: VerificationActionState = await rejectProviderAction(
        locale,
        providerId,
        rejectNotes,
      );
      if (!state.ok) {
        setError(state.code);
        // Si el motivo es corto, mantenemos el diálogo abierto para
        // que el admin pueda corregirlo sin volver a abrir.
        return;
      }
      setRejectOpen(false);
    });
  }, [providerId, locale, rejectNotes]);

  return {
    isPending,
    error,
    rejectOpen,
    rejectNotes,
    setRejectNotes,
    approve,
    openRejectDialog,
    closeRejectDialog,
    submitReject,
  };
}
