/**
 * Tipos del diálogo «liberar hueco con descuento».
 */
import type { ReactNode } from 'react';

import type { SlotOfferDiscounts } from '@/lib/utils/slot-offer-pricing';

import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';

/** Tramo de tiempo hasta el inicio del hueco. */
export type DiscountTier = keyof SlotOfferDiscounts;

/**
 * Qué hueco se libera:
 *  - `cancelled`: el que dejó una reserva recién cancelada (3 tramos).
 *  - `free`: uno libre que empieza en menos de 2 h (el tramo de más de
 *    2 h no aplica, así que solo se piden 2).
 */
export type ReleaseSlotTarget =
  | { kind: 'cancelled'; bookingId: string; startAtIso: string }
  | {
      kind: 'free';
      serviceId: string;
      startAtIso: string;
      serviceName: string;
      startTime: string;
    };

/** Aviso que acompaña al diálogo (p. ej., la cancelación sin reembolso). */
export type ReleaseSlotNotice = 'refundFailed';

/** Petición de abrir el diálogo. */
export interface ReleaseSlotRequest {
  target: ReleaseSlotTarget;
  notice?: ReleaseSlotNotice | null;
}

/** Problema de los tramos que la UI explica antes de enviar. */
export type DiscountIssue = 'underOneHourMin' | 'decreasing' | 'outOfRange';

/** Abre el diálogo; lo expone el proveedor de contexto del calendario. */
export type OpenReleaseSlotPrompt = (request: ReleaseSlotRequest) => void;

export interface ReleaseSlotPromptProviderProps {
  locale: SupportedLocale;
  children: ReactNode;
  /**
   * Petición a abrir nada más montar: el enlace del email «un cliente ha
   * cancelado» (`?liberar=<bookingId>`) lleva directo al diálogo de
   * liberar esa hora. La página solo la pasa si el servidor ve la
   * reserva liberable.
   */
  initialRequest?: ReleaseSlotRequest | null;
}

export interface ReleaseSlotDialogProps {
  locale: SupportedLocale;
  /** `null` = cerrado. */
  request: ReleaseSlotRequest | null;
  /** Cambia en cada apertura para reiniciar el formulario. */
  requestKey: number;
  onClose: () => void;
}

export interface ReleaseSlotFormProps {
  locale: SupportedLocale;
  request: ReleaseSlotRequest;
  onClose: () => void;
}

export interface ReleaseCancelledSlotButtonProps {
  bookingId: string;
  /** Inicio de la reserva cancelada en ISO-8601. */
  startAtIso: string;
  disabled?: boolean;
}

export interface ReleaseFreeSlotButtonProps {
  serviceId: string;
  serviceName: string;
  startAtIso: string;
  startTime: string;
  disabled?: boolean;
}
