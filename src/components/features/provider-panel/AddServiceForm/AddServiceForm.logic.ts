'use client';

import { useCallback, useMemo, useState } from 'react';

import type { AddServiceDraft, CategoryRoot, CategoryType } from './AddServiceForm.types';

/**
 * Estado inicial vacío del borrador de servicio.
 * Mantener una constante facilita el reset desde el botón "Cancelar"
 * cuando el form está en modo creación.
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
 * Hook que gestiona el draft del formulario de alta/edición de servicio.
 *
 * Centraliza:
 *  - cascada categoría → tipo → subtipo (resetea los hijos cuando el
 *    padre cambia, para evitar combinaciones imposibles);
 *  - cálculo de las opciones disponibles en cada nivel;
 *  - actualización de los campos de detalle (nombre, duración, precio).
 *
 * El árbol de categorías llega por argumento desde el componente para
 * que la fuente de verdad sea la página server-side (BD) y no un fake.
 * `initialValues` (opcional) pre-rellena el draft en modo edición; en
 * modo creación se ignora y el draft arranca vacío.
 */
export function useAddServiceForm(categoriesTree: CategoryRoot[], initialValues?: AddServiceDraft) {
  const [draft, setDraft] = useState<AddServiceDraft>(initialValues ?? EMPTY_DRAFT);

  const rootOptions: CategoryRoot[] = categoriesTree;

  const typeOptions: CategoryType[] = useMemo(() => {
    if (!draft.rootCategoryId) return [];
    const root = categoriesTree.find((r) => r.id === draft.rootCategoryId);
    return root?.types ?? [];
  }, [categoriesTree, draft.rootCategoryId]);

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

  // En modo edición, "reset" vuelve a los valores iniciales del Service;
  // en modo creación, al draft vacío. Así el botón Cancelar nunca pierde
  // los datos originales por accidente al editar.
  const reset = useCallback(() => setDraft(initialValues ?? EMPTY_DRAFT), [initialValues]);

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
