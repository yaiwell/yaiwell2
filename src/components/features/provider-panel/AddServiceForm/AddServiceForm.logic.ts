'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  categoriesHierarchy,
  type CategoryRoot,
  type CategoryType,
} from '@/lib/fake-data/categories-hierarchy';

import type { AddServiceDraft } from './AddServiceForm.types';

/**
 * Estado inicial vacío del borrador de servicio.
 * Mantener una constante facilita el reset desde el botón "Cancelar".
 */
const EMPTY_DRAFT: AddServiceDraft = {
  rootCategoryId: null,
  typeId: null,
  subtypeId: null,
  name: '',
  description: '',
  durationMinutes: '',
  priceEuros: '',
};

/**
 * Hook que gestiona el draft del formulario de alta de servicio.
 *
 * Centraliza:
 *  - cascada categoría → tipo → subtipo (resetea los hijos cuando el
 *    padre cambia, para evitar combinaciones imposibles);
 *  - cálculo de las opciones disponibles en cada nivel;
 *  - actualización de los campos de detalle (nombre, duración, precio).
 *
 * No persiste todavía: el `submit` solo limpia el draft. Cuando exista
 * API real, este hook expondrá un `submit` async con loading/error.
 */
export function useAddServiceForm() {
  const [draft, setDraft] = useState<AddServiceDraft>(EMPTY_DRAFT);

  const rootOptions: CategoryRoot[] = categoriesHierarchy;

  const typeOptions: CategoryType[] = useMemo(() => {
    if (!draft.rootCategoryId) return [];
    const root = categoriesHierarchy.find((r) => r.id === draft.rootCategoryId);
    return root?.types ?? [];
  }, [draft.rootCategoryId]);

  const subtypeOptions = useMemo(() => {
    if (!draft.typeId) return [];
    const type = typeOptions.find((t) => t.id === draft.typeId);
    return type?.subtypes ?? [];
  }, [typeOptions, draft.typeId]);

  /**
   * Selecciona la categoría raíz y resetea tipo+subtipo, porque las
   * opciones del nivel inferior dependen de este valor.
   */
  const selectRoot = useCallback((rootId: string) => {
    setDraft((prev) => ({
      ...prev,
      rootCategoryId: rootId || null,
      typeId: null,
      subtypeId: null,
    }));
  }, []);

  /**
   * Selecciona el tipo y resetea el subtipo (mismo razonamiento que
   * `selectRoot`).
   */
  const selectType = useCallback((typeId: string) => {
    setDraft((prev) => ({
      ...prev,
      typeId: typeId || null,
      subtypeId: null,
    }));
  }, []);

  const selectSubtype = useCallback((subtypeId: string) => {
    setDraft((prev) => ({ ...prev, subtypeId: subtypeId || null }));
  }, []);

  const updateField = useCallback(
    <K extends keyof AddServiceDraft>(key: K, value: AddServiceDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => setDraft(EMPTY_DRAFT), []);

  return {
    draft,
    rootOptions,
    typeOptions,
    subtypeOptions,
    selectRoot,
    selectType,
    selectSubtype,
    updateField,
    reset,
  };
}
