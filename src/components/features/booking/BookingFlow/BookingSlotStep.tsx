'use client';

// Import directo al archivo client-safe, nunca al barrel del módulo.
import type { BookingSlot } from '@/lib/services/availability/availability.client';
import type { PublicProfessional } from '@/types/domain';

import { ProfessionalPicker } from '../ProfessionalPicker';
import { SlotPicker } from '../SlotPicker';
import type { SlotPickerLocale } from '../SlotPicker/SlotPicker.types';

import { bookingFlowStyles as s } from './BookingFlow.styles';

interface BookingSlotStepProps {
  providerId: string;
  serviceId: string;
  serviceDurationMinutes: number;
  locale: SlotPickerLocale;
  professionals: PublicProfessional[];
  /** Profesional elegido; `null` = «cualquiera disponible». */
  professionalId: string | null;
  selectedStartIso: string | null;
  initialSlotIso?: string | null;
  onSelectProfessional: (professionalId: string | null) => void;
  onSelectSlot: (slot: BookingSlot) => void;
  /** La hora elegida ya no está en la agenda del profesional actual. */
  onSlotGone: () => void;
}

/**
 * Paso «Elige tu hueco»: quién te atiende (si hay donde elegir) y cuándo.
 *
 * Va en su propio archivo para que `BookingFlow.tsx` siga siendo pura
 * composición de pasos. El profesional elegido filtra los huecos que
 * pide el SlotPicker; si ese profesional deja de prestar el servicio,
 * el SlotPicker ofrece volver a «cualquiera».
 */
export function BookingSlotStep({
  providerId,
  serviceId,
  serviceDurationMinutes,
  locale,
  professionals,
  professionalId,
  selectedStartIso,
  initialSlotIso,
  onSelectProfessional,
  onSelectSlot,
  onSlotGone,
}: BookingSlotStepProps) {
  return (
    <div className={s.slotStep}>
      <ProfessionalPicker
        professionals={professionals}
        value={professionalId}
        onChange={onSelectProfessional}
      />
      <SlotPicker
        providerId={providerId}
        serviceId={serviceId}
        serviceDurationMinutes={serviceDurationMinutes}
        locale={locale}
        selectedStartIso={selectedStartIso}
        initialSlotIso={initialSlotIso}
        professionalId={professionalId}
        onSelect={onSelectSlot}
        onSelectionGone={onSlotGone}
        onResetProfessional={() => onSelectProfessional(null)}
      />
    </div>
  );
}
