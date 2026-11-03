'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { ServiceProfessionalOption } from './AddServiceForm.types';

/**
 * Estado del selector «Quién lo presta».
 *
 * Solo aplica con dos o más profesionales activos; si no, `professionalIds`
 * sale `undefined` y el servidor conserva su comportamiento de siempre.
 * En el alta arranca con todo el equipo marcado; en la edición, con la
 * asignación actual (filtrada a los activos).
 */
export function useServiceProfessionals(
  options: readonly ServiceProfessionalOption[],
  initialIds?: readonly string[],
) {
  const tForm = useTranslations('providerPanel.services.form');
  const enabled = options.length > 1;
  const [selected, setSelected] = useState<string[]>(() => {
    const activeIds = options.map((o) => o.id);
    if (!initialIds) return activeIds;
    return activeIds.filter((id) => initialIds.includes(id));
  });

  const toggle = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  // Mínimo uno: con el selector vacío se avisa sin llamar al servidor.
  const isEmpty = enabled && selected.length === 0;

  return {
    enabled,
    selected,
    toggle,
    /** Lo que viaja a la action. */
    professionalIds: enabled ? selected : undefined,
    isEmpty,
    /** Mensaje que corta el envío; `undefined` si hay alguien elegido. */
    emptyMessage: isEmpty ? tForm('professionalsRequired') : undefined,
  };
}
