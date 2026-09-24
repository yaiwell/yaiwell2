'use client';

import { useEffect, useState } from 'react';

import { getBookingStatusAction } from '@/app/[locale]/centro/[slugWithId]/reservar/actions';

/**
 * Seguimiento del estado real de la reserva en la pantalla final.
 *
 * El webhook `payment_intent.succeeded` es la única vía a `confirmed`
 * (ver `DO.md`, 2026-08-31), y tarda unos segundos en llegar. El camino
 * sin 3DS —el mayoritario— resolvía el pago sin salir de la página y
 * cantaba "¡Reserva confirmada!" antes de que eso ocurriera.
 *
 * Este hook arranca asumiendo **pago en curso**, que es la verdad en el
 * instante en que Stripe devuelve el control, y sólo pasa a confirmada
 * cuando BD lo dice. No es un estado optimista al revés: es el estado
 * observado, con el copy honesto que ya existía para él.
 */

/** Separación entre consultas mientras la reserva sigue sin confirmar. */
export const PAYMENT_STATUS_POLL_INTERVAL_MS = 2_000;

/**
 * Número máximo de consultas.
 *
 * Con 5 intentos cubrimos ~8 s, de sobra para un webhook sano. Pasado
 * eso dejamos de insistir: el copy de "pago en curso" ya remite a
 * «Mis reservas», donde el estado se relee en cada visita. Insistir
 * indefinidamente sólo castigaría al servidor desde una pestaña que el
 * usuario puede haber abandonado.
 */
export const PAYMENT_STATUS_MAX_POLLS = 5;

/**
 * Consulta el estado de la reserva hasta verla confirmada.
 *
 * @param args.bookingId — reserva a vigilar; `null` desactiva el hook.
 * @param args.active — `true` sólo en la pantalla de confirmación, para
 *   no consultar mientras el usuario sigue rellenando el formulario.
 * @returns `paymentPending`, que es lo que decide el copy de la
 *   confirmación.
 */
export function useBookingPaymentStatus(args: { bookingId: string | null; active: boolean }): {
  paymentPending: boolean;
} {
  const { bookingId, active } = args;
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (!active || !bookingId || isConfirmed) return;

    let cancelled = false;
    let handle: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      const result = await getBookingStatusAction({ bookingId });
      // El componente pudo desmontarse durante el viaje a servidor.
      if (cancelled) return;

      if (result.ok && result.isConfirmed) {
        setIsConfirmed(true);
        return;
      }
      // Un error (sesión caída, reserva no encontrada) no se pinta: el
      // copy de "pago en curso" ya es correcto y remite a «Mis
      // reservas». Un banner de error aquí asustaría a quien acaba de
      // pagar sin darle ninguna acción útil.
      if (attempts >= PAYMENT_STATUS_MAX_POLLS) return;
      handle = setTimeout(() => {
        void poll();
      }, PAYMENT_STATUS_POLL_INTERVAL_MS);
    }

    void poll();

    return () => {
      cancelled = true;
      if (handle !== null) clearTimeout(handle);
    };
  }, [active, bookingId, isConfirmed]);

  return { paymentPending: !isConfirmed };
}
