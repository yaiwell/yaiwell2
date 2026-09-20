'use client';

import { useEffect, useState } from 'react';

import { canCancelBooking } from '@/lib/utils/booking-cancellation';

/**
 * Mantiene viva en el cliente la ventana de cancelación de 2 h (§4.bis).
 *
 * El primer render DEBE devolver el valor calculado en el servidor: si
 * recalculásemos con el reloj del navegador en el render inicial,
 * cualquier desfase de segundos produciría un mismatch de hidratación.
 * Por eso el recálculo vive en un `useEffect`, ya en cliente.
 *
 * A partir de ahí revisamos cada minuto: una pestaña abierta tres horas
 * no puede seguir ofreciendo cancelar una cita que ahora está a diez
 * minutos. El movimiento es siempre en un sentido —de "se puede" a "ya
 * no"— porque el tiempo solo avanza; si el servidor ya dijo que no, no
 * hay nada que vigilar y no programamos intervalo.
 *
 * La UI solo **refleja** la regla: el service la revalida al recibir la
 * petición, así que un reloj adelantado en el cliente no la salta.
 *
 * @param startAtIso — inicio de la reserva en ISO-8601, o `null` en preview.
 * @param initialCancellable — veredicto del servidor en el primer render.
 * @returns si la cancelación sigue permitida ahora mismo.
 */
export function useCancellationWindow(
  startAtIso: string | null,
  initialCancellable: boolean,
): boolean {
  const [cancellable, setCancellable] = useState(initialCancellable);

  useEffect(() => {
    if (!initialCancellable || !startAtIso) {
      return;
    }

    const startAt = new Date(startAtIso);
    // El estado ya lo filtró el servidor al decidir mostrar el botón;
    // aquí solo nos interesa la parte temporal de la regla.
    const check = () => {
      if (!canCancelBooking({ startAt, status: 'confirmed' }, new Date())) {
        setCancellable(false);
      }
    };

    check();
    const intervalId = setInterval(check, 60_000);
    return () => clearInterval(intervalId);
  }, [initialCancellable, startAtIso]);

  return cancellable;
}
