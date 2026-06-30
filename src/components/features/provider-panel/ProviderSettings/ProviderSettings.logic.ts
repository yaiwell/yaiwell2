'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';

import {
  updateProviderScheduleAction,
  updateProviderSettingsAction,
  type UpdateProviderScheduleActionState,
  type UpdateProviderSettingsActionState,
} from '@/app/[locale]/panel/centro/actions';
import type { AppLocale } from '@/i18n/routing';
import type { WeeklySchedule } from '@/lib/services/availability';

import type { ProviderSettingsDraft, SaveErrorCode, SaveNotice } from './ProviderSettings.types';

/**
 * Hook que orquesta el estado del formulario de `ProviderSettings`.
 *
 * Centraliza:
 *  - el `draft` controlado de los cuatro campos editables (businessName,
 *    vatNumber, description, address);
 *  - el `schedule` semanal editable por `ScheduleEditor`;
 *  - el envío en paralelo de `updateProviderSettingsAction` y
 *    `updateProviderScheduleAction` dentro de `useTransition`. Si una
 *    falla y la otra no, mostramos el primer error — el usuario reintenta
 *    y la operación es idempotente, así que no perdemos datos.
 *  - el `notice` (éxito/error) con auto-ocultado tras 3s en éxito.
 */
export function useProviderSettingsForm(
  locale: AppLocale,
  initialDraft: ProviderSettingsDraft,
  initialSchedule: WeeklySchedule,
) {
  const [draft, setDraft] = useState<ProviderSettingsDraft>(initialDraft);
  const [schedule, setSchedule] = useState<WeeklySchedule>(initialSchedule);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [isPending, startTransition] = useTransition();

  /** Actualiza un campo concreto del draft sin perder los demás. */
  const updateField = useCallback(
    <K extends keyof ProviderSettingsDraft>(field: K, value: ProviderSettingsDraft[K]) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  /**
   * Lanza ambas actions en paralelo y resume el resultado:
   *  - Si ambas OK → notice de éxito.
   *  - Si alguna falla → notice de error con el primer code encontrado
   *    (settings primero porque suele ser el campo más editado;
   *    schedule después).
   */
  const submit = useCallback(() => {
    setNotice(null);
    startTransition(async () => {
      const [settingsResult, scheduleResult]: [
        UpdateProviderSettingsActionState,
        UpdateProviderScheduleActionState,
      ] = await Promise.all([
        updateProviderSettingsAction(locale, {
          businessName: draft.businessName,
          vatNumber: draft.vatNumber,
          description: draft.description,
          address: draft.address,
        }),
        updateProviderScheduleAction(locale, schedule),
      ]);

      const firstError = pickFirstError(settingsResult, scheduleResult);
      if (firstError) {
        setNotice({ kind: 'error', code: firstError });
      } else {
        setNotice({ kind: 'success' });
      }
    });
  }, [draft, schedule, locale]);

  /**
   * Auto-oculta el notice de éxito tras 3 segundos para no contaminar
   * la UI. El de error queda hasta el siguiente intento.
   */
  useEffect(() => {
    if (notice?.kind !== 'success') return;
    const handle = window.setTimeout(() => setNotice(null), 3_000);
    return () => window.clearTimeout(handle);
  }, [notice]);

  return {
    draft,
    schedule,
    setSchedule,
    notice,
    isPending,
    updateField,
    submit,
  };
}

/**
 * Devuelve el primer `code` de error encontrado entre las dos actions,
 * o `null` si ambas tuvieron éxito. Centralizado en un helper para que
 * el orden de prioridad (settings antes que schedule) quede explícito.
 */
function pickFirstError(
  settings: UpdateProviderSettingsActionState,
  schedule: UpdateProviderScheduleActionState,
): SaveErrorCode | null {
  if (!settings.ok) return settings.code;
  if (!schedule.ok) return schedule.code;
  return null;
}
