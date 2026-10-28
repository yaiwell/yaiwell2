'use client';

import { useCallback, useState } from 'react';

// Import directo al archivo client-safe, nunca al barrel del módulo.
import type {
  BookingSlot,
  BookingSlotOffer,
} from '@/lib/services/availability/availability.client';

import type { DisplayedBookingPrice } from '../DiscountedPrice';

import type { CheckoutState } from './BookingFlow.types';

/**
 * Importe que enseña el flujo de reserva en cada momento.
 *
 * Vive aparte de `BookingFlow.logic.ts` (que ya roza las ~250 líneas)
 * y separa la regla en una función pura que se prueba sin React.
 */

export type { DisplayedBookingPrice };

/**
 * Decide qué importe enseñar.
 *
 * En cuanto hay reserva (`checkout` `ready`) mandan SIEMPRE los datos
 * del servidor, también el tachado: el tramo de descuento puede haber
 * cambiado entre que el usuario eligió el hueco y que se creó la
 * reserva. Antes de eso enseñamos el precio del hueco elegido (con su
 * oferta, si la tenía) o el del catálogo.
 *
 * @param checkout — estado del checkout del flujo.
 * @param servicePriceCents — precio vigente del servicio.
 * @param previewOffer — oferta del hueco elegido, si la tenía.
 */
export function resolveDisplayedPrice(
  checkout: CheckoutState,
  servicePriceCents: number,
  previewOffer: BookingSlotOffer | null,
): DisplayedBookingPrice {
  if (checkout.status === 'ready') {
    return {
      amountCents: checkout.amountCents,
      originalPriceCents: checkout.originalPriceCents,
      discountPct: checkout.discountPct,
      isEstimate: false,
    };
  }
  if (previewOffer) {
    return {
      amountCents: previewOffer.priceCents,
      originalPriceCents: previewOffer.originalPriceCents,
      discountPct: previewOffer.discountPct,
      isEstimate: true,
    };
  }
  return {
    amountCents: servicePriceCents,
    originalPriceCents: null,
    discountPct: null,
    isEstimate: true,
  };
}

/**
 * Qué le ha pasado al descuento del hueco entre elegirlo y reservarlo.
 *
 * - `lost`: el hueco se eligió con oferta y el servidor la ha cobrado
 *   sin descuento (oferta retirada, caducada o vendida).
 * - `changed`: sigue habiendo descuento pero el importe es mayor que el
 *   previsto (por ejemplo, el tramo ha cambiado).
 */
export type DiscountChange =
  | { kind: 'lost'; amountCents: number }
  | { kind: 'changed'; amountCents: number; discountPct: number };

/**
 * Compara el precio previsto del hueco con el que ha fijado el servidor.
 *
 * Solo avisa cuando el cliente sale perdiendo: si el importe real es
 * igual o menor que el previsto no hay nada que explicar (el pago ya
 * enseña la cifra buena). El importe del aviso es siempre el del
 * servidor, que es el que se cobra.
 *
 * @param previewOffer — oferta del hueco elegido, si la tenía.
 * @param checkout — estado del checkout del flujo.
 * @returns el cambio a avisar, o `null` si no hay nada que decir.
 */
export function resolveDiscountChange(
  previewOffer: BookingSlotOffer | null,
  checkout: CheckoutState,
): DiscountChange | null {
  if (!previewOffer || checkout.status !== 'ready') return null;
  if (checkout.discountPct === null || checkout.originalPriceCents === null) {
    return { kind: 'lost', amountCents: checkout.amountCents };
  }
  if (checkout.amountCents > previewOffer.priceCents) {
    return {
      kind: 'changed',
      amountCents: checkout.amountCents,
      discountPct: checkout.discountPct,
    };
  }
  return null;
}

/**
 * Recuerda la oferta del último hueco elegido y calcula el importe.
 *
 * La oferta solo vale para ese hueco: si el borrador apunta a otro (por
 * ejemplo, uno recuperado de `sessionStorage` tras iniciar sesión) se
 * cae al precio de catálogo hasta que el servidor diga el real.
 *
 * @param checkout — estado del checkout del flujo.
 * @param servicePriceCents — precio vigente del servicio.
 * @param selectedStartIso — hueco del borrador.
 */
export function useBookingPrice(
  checkout: CheckoutState,
  servicePriceCents: number,
  selectedStartIso: string | null,
) {
  const [picked, setPicked] = useState<{ startAtIso: string; offer: BookingSlotOffer } | null>(
    null,
  );

  const rememberSlot = useCallback((slot: BookingSlot) => {
    setPicked(slot.offer ? { startAtIso: slot.startAtIso, offer: slot.offer } : null);
  }, []);

  const previewOffer = picked && picked.startAtIso === selectedStartIso ? picked.offer : null;

  return {
    price: resolveDisplayedPrice(checkout, servicePriceCents, previewOffer),
    /** Aviso para el paso de pago si el descuento previsto se ha perdido. */
    discountChange: resolveDiscountChange(previewOffer, checkout),
    rememberSlot,
  };
}
