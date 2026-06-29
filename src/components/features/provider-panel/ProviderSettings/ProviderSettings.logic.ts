'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';

import {
  updateProviderSettingsAction,
  type UpdateProviderSettingsActionState,
} from '@/app/[locale]/panel/centro/actions';
import type { AppLocale } from '@/i18n/routing';

import type { ProviderSettingsDraft, SaveNotice } from './ProviderSettings.types';

/**
 * Hook que orquesta el estado del formulario de `ProviderSettings`.
 *
 * Centraliza:
 *  - el `draft` controlado de los cuatro campos editables hoy
 *    (businessName, vatNumber, description, address);
 *  - el envío a la server action `updateProviderSettingsAction` dentro
 *    de un `useTransition` para no bloquear la UI;
 *  - el `notice` (éxito/error) con auto-ocultado tras 3s en el caso de
 *    éxito — el de error persiste hasta que el usuario reintente.
 *
 * El hook no decide qué texto mostrar (eso es i18n en el componente).
 * Devuelve un código tipado por error para que la vista mapee a `t()`.
 */
export function useProviderSettingsForm(locale: AppLocale, initial: ProviderSettingsDraft) {
  const [draft, setDraft] = useState<ProviderSettingsDraft>(initial);
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
   * Lanza el submit a la server action y traduce el resultado a un
   * `SaveNotice`. Resetea el notice antes para que el feedback sea
   * obvio incluso si el usuario reintenta sin modificar nada.
   */
  const submit = useCallback(() => {
    setNotice(null);
    startTransition(async () => {
      const result: UpdateProviderSettingsActionState = await updateProviderSettingsAction(locale, {
        businessName: draft.businessName,
        vatNumber: draft.vatNumber,
        description: draft.description,
        address: draft.address,
      });
      if (result.ok) {
        setNotice({ kind: 'success' });
      } else {
        setNotice({ kind: 'error', code: result.code });
      }
    });
  }, [draft, locale]);

  /**
   * Auto-oculta el notice de éxito tras 3 segundos para no contaminar
   * la UI. El de error queda hasta el siguiente intento (decisión de
   * producto: el usuario debe verlo).
   */
  useEffect(() => {
    if (notice?.kind !== 'success') return;
    const handle = window.setTimeout(() => setNotice(null), 3_000);
    return () => window.clearTimeout(handle);
  }, [notice]);

  return {
    draft,
    notice,
    isPending,
    updateField,
    submit,
  };
}
