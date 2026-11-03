'use client';

import { useCallback, useState, useTransition, type FormEvent } from 'react';

import {
  createProfessionalAction,
  deactivateProfessionalAction,
  reactivateProfessionalAction,
  updateProfessionalAction,
} from '@/app/[locale]/panel/equipo/actions';
import type {
  BlockingBookingDto,
  TeamActionState,
} from '@/app/[locale]/panel/equipo/actions.errors';
import type { AppLocale } from '@/i18n/routing';

import type {
  ProfessionalDraft,
  ProfessionalFormInitial,
  ProfessionalNotice,
} from './ProfessionalForm.types';

/** Convierte un fallo de la action en aviso para la UI. */
function toNotice(result: TeamActionState): ProfessionalNotice | null {
  if (result.ok) return null;
  return { kind: 'error', code: result.code, services: result.services };
}

/**
 * Estado y envío del formulario de profesional.
 *
 * En el alta, la action redirige al listado al terminar; en la edición
 * se queda en la página y avisa «Cambios guardados».
 */
export function useProfessionalForm(
  locale: AppLocale,
  initial: ProfessionalDraft,
  professionalId?: string,
) {
  const [draft, setDraft] = useState<ProfessionalDraft>(initial);
  const [notice, setNotice] = useState<ProfessionalNotice | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateField = useCallback(
    <K extends keyof ProfessionalDraft>(key: K, value: ProfessionalDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleService = useCallback((serviceId: string) => {
    setDraft((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }));
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = professionalId
        ? await updateProfessionalAction(locale, professionalId, draft)
        : await createProfessionalAction(locale, draft);
      // En el alta con éxito la action redirige y no llega aquí.
      setNotice(result.ok ? { kind: 'saved' } : toNotice(result));
    });
  }

  return { draft, updateField, toggleService, notice, isPending, handleSubmit };
}

/**
 * Baja y reactivación desde la ficha del profesional.
 *
 * Si la baja falla por citas futuras, la lista que devuelve el servidor
 * sustituye a la precargada (puede haber entrado una cita nueva).
 */
export function useProfessionalLifecycle(
  locale: AppLocale,
  professional: ProfessionalFormInitial | undefined,
  initialBookings: BlockingBookingDto[],
) {
  const [bookings, setBookings] = useState<BlockingBookingDto[]>(initialBookings);
  const [notice, setNotice] = useState<ProfessionalNotice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function deactivate() {
    if (!professional) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deactivateProfessionalAction(locale, professional.id);
      if (result.ok) {
        setDialogOpen(false);
        return;
      }
      if (result.bookings) setBookings(result.bookings);
      setNotice(toNotice(result));
    });
  }

  function reactivate() {
    if (!professional) return;
    setNotice(null);
    startTransition(async () => {
      setNotice(toNotice(await reactivateProfessionalAction(locale, professional.id)));
    });
  }

  function onDialogOpenChange(open: boolean) {
    if (!open) setNotice(null);
    setDialogOpen(open);
  }

  return {
    bookings,
    notice,
    isPending,
    dialogOpen,
    onDialogOpenChange,
    deactivate,
    reactivate,
  };
}
