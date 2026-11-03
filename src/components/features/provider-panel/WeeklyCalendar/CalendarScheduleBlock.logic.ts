'use client';

import { useState, useTransition } from 'react';

import { removeScheduleBlockAction } from '@/app/[locale]/panel/calendario/schedule-blocks.actions';
import { useRouter } from '@/i18n/navigation';
import { toIntlLocale } from '@/lib/i18n';
import type { ScheduleBlockErrorCode } from '@/lib/services/schedule-blocks/schedule-blocks.types';
import { PANEL_TIMEZONE } from '@/lib/utils/madrid-week';

import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';

/** Errores de quitar un bloqueo que sabemos contar al profesional. */
export type RemoveBlockErrorKey = 'notFound' | 'forbidden' | 'internal';

/** Código de la action → clave i18n de `scheduleBlocks.remove.errors`. */
export function toRemoveBlockErrorKey(code: ScheduleBlockErrorCode): RemoveBlockErrorKey {
  if (code === 'NOT_FOUND') return 'notFound';
  if (code === 'FORBIDDEN') return 'forbidden';
  return 'internal';
}

/**
 * Rango completo de un bloqueo en hora de Madrid («lun, 3 nov, 14:00 –
 * mié, 5 nov, 10:00»). El bloque de la rejilla solo enseña el tramo de
 * su día; en el detalle se ve el bloqueo entero.
 *
 * @returns `null` si faltan los instantes (ejemplos del modo preview).
 */
export function formatBlockRange(
  startAtIso: string | null,
  endAtIso: string | null,
  locale: SupportedLocale,
): string | null {
  if (!startAtIso || !endAtIso) return null;
  const format = new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: PANEL_TIMEZONE,
  });
  return `${format.format(new Date(startAtIso))} – ${format.format(new Date(endAtIso))}`;
}

/**
 * Quitar un bloqueo en dos pasos: «Quitar bloqueo» pide confirmación en
 * el mismo diálogo (sin apilar otro) y «Sí, quitar» llama a la action.
 * Si sale bien, refrescamos la ruta para que el bloque desaparezca de
 * la rejilla y mientras tanto contamos que se ha quitado.
 */
export function useRemoveScheduleBlock(locale: SupportedLocale, blockId: string) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [errorKey, setErrorKey] = useState<RemoveBlockErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  function askConfirmation() {
    setErrorKey(null);
    setConfirming(true);
  }

  function cancelConfirmation() {
    setConfirming(false);
  }

  function remove() {
    setErrorKey(null);
    startTransition(async () => {
      const result = await removeScheduleBlockAction(locale, blockId);
      if (!result.ok) {
        setErrorKey(toRemoveBlockErrorKey(result.code));
        return;
      }
      setRemoved(true);
      setConfirming(false);
      router.refresh();
    });
  }

  /** Al cerrar el diálogo se vuelve al primer paso (sin confirmación a medias). */
  function reset() {
    setConfirming(false);
    setErrorKey(null);
  }

  return {
    confirming,
    removed,
    errorKey,
    isPending,
    askConfirmation,
    cancelConfirmation,
    remove,
    reset,
  };
}
