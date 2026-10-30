'use client';

import { useCallback, useRef, useState } from 'react';

import {
  createOnsiteBookingAction,
  type OnsiteBookingActionState,
} from '@/app/[locale]/centro/[slugWithId]/reservar/onsite-actions';

/**
 * Reserva con pago en el local dentro del flujo (§4.bis).
 *
 * A diferencia del checkout online, aquí no se crea nada al entrar en el
 * paso: la reserva nace `confirmed` al pulsar «Confirmar reserva», así
 * que no hay hueco retenido que soltar si el cliente se arrepiente.
 */

/** Resultado OK de la action, tal cual lo pinta la confirmación. */
export type OnsiteBookingDone = Extract<OnsiteBookingActionState, { ok: true }>;

/** Fallo de la action, con el motivo si el local no está permitido. */
export type OnsiteBookingFailure = Extract<OnsiteBookingActionState, { ok: false }>;

/** Máquina de estados de la reserva en el local. */
export type OnsiteBookingState =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'error'; error: OnsiteBookingFailure }
  | { status: 'done'; booking: OnsiteBookingDone };

/** Lo que la action necesita del flujo en el momento de confirmar. */
export interface OnsiteBookingRequest {
  serviceId: string;
  slotStartIso: string;
  notes: string;
  /** `pending` propia abierta antes por el pago online, si la hay. */
  replacesPendingBookingId: string | null;
}

/**
 * Si, con este fallo, la action llegó a soltar la `pending` anterior. Sin
 * sesión, con entrada inválida o con la `pending` ya pagada, la action
 * para antes y la reserva online sigue siendo válida.
 */
export function releaseWasAttempted(error: OnsiteBookingFailure): boolean {
  return (
    error.code !== 'UNAUTHENTICATED' &&
    error.code !== 'VALIDATION' &&
    error.code !== 'PENDING_ALREADY_PAID'
  );
}

/**
 * Hook de la reserva en el local.
 *
 * @param callbacks.onCreated — la reserva ya existe: pasar a la confirmación.
 * @param callbacks.onPendingReleased — se pidió soltar una `pending` y la
 *   creación falló después: el checkout online que la usaba ya no vale.
 */
export function useOnsiteBooking(callbacks: {
  onCreated: (booking: OnsiteBookingDone) => void;
  onPendingReleased: () => void;
}) {
  const { onCreated, onPendingReleased } = callbacks;
  const [state, setState] = useState<OnsiteBookingState>({ status: 'idle' });
  // Ref además del estado: un doble clic en el mismo tick crearía dos reservas.
  const inFlight = useRef(false);

  const confirm = useCallback(
    async (request: OnsiteBookingRequest) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setState({ status: 'creating' });
      let result: OnsiteBookingActionState;
      try {
        result = await createOnsiteBookingAction({
          serviceId: request.serviceId,
          slotStartIso: request.slotStartIso,
          notes: request.notes.trim() || undefined,
          replacesPendingBookingId: request.replacesPendingBookingId,
        });
      } catch {
        result = { ok: false, code: 'INTERNAL' };
      }
      inFlight.current = false;
      if (result.ok) {
        setState({ status: 'done', booking: result });
        onCreated(result);
        return;
      }
      if (request.replacesPendingBookingId && releaseWasAttempted(result)) {
        onPendingReleased();
      }
      setState({ status: 'error', error: result });
    },
    [onCreated, onPendingReleased],
  );

  /** Vuelve a `idle` (al cambiar de hueco o de método). */
  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, confirm, reset };
}
