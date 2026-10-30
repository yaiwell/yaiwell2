'use client';

import { useEffect, useState } from 'react';

import { getPaymentOptionsAction } from '@/app/[locale]/centro/[slugWithId]/reservar/onsite-actions';
import type { PaymentOptions } from '@/lib/services/checkout';

import type { BookingPaymentMethod } from './BookingFlow.types';

/**
 * Métodos de pago del hueco elegido (§4.bis, pago en el local).
 *
 * Vive aparte de `BookingFlow.logic.ts` (que ya roza las ~250 líneas).
 * La consulta es orientativa: el servidor lo repite todo al reservar.
 */

/** Estado de la consulta para el hueco actual. */
export type PaymentOptionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; options: PaymentOptions }
  // Sin respuesta útil: el pago online sigue disponible siempre.
  | { status: 'unavailable' };

interface FetchedOptions {
  key: string;
  result: PaymentOptions | null;
}

/**
 * Pide los métodos de pago cada vez que cambia el hueco.
 *
 * El estado se guarda junto a la clave del hueco que lo pidió: «cargando»
 * se deriva de que la clave no coincida, sin `setState` síncrono en el
 * efecto, y una respuesta tardía de un hueco anterior nunca pisa la del
 * actual.
 *
 * @param serviceId — servicio del flujo.
 * @param slotStartIso — hueco elegido; `null` no consulta.
 */
export function usePaymentOptions(
  serviceId: string,
  slotStartIso: string | null,
): PaymentOptionsState {
  const [fetched, setFetched] = useState<FetchedOptions | null>(null);
  const key = slotStartIso ? `${serviceId}|${slotStartIso}` : null;

  useEffect(() => {
    if (!key || !slotStartIso) return;
    let cancelled = false;
    void getPaymentOptionsAction({ serviceId, slotStartIso })
      .then((res) => (res.ok ? res.options : null))
      .catch(() => null)
      .then((result) => {
        if (!cancelled) setFetched({ key, result });
      });
    return () => {
      cancelled = true;
    };
  }, [key, serviceId, slotStartIso]);

  if (!key) return { status: 'idle' };
  if (fetched?.key !== key) return { status: 'loading' };
  return fetched.result ? { status: 'ready', options: fetched.result } : { status: 'unavailable' };
}

/**
 * Método con el que se reservará de verdad: la preferencia del cliente
 * solo vale si el pago en el local está disponible para este hueco.
 * Mientras se consulta, o si no se pudo saber, es online.
 *
 * @param preferred — lo que eligió el cliente.
 * @param state — métodos de pago del hueco.
 */
export function resolveEffectivePaymentMethod(
  preferred: BookingPaymentMethod,
  state: PaymentOptionsState,
): BookingPaymentMethod {
  if (preferred !== 'onsite') return 'online';
  return state.status === 'ready' && state.options.onsite === 'available' ? 'onsite' : 'online';
}
