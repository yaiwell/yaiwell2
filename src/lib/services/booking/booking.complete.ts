/**
 * Paso común a todo cierre de una reserva como `completed`: lo marque el
 * negocio, lo haga el cron a las 72 h o salga de deshacer un «no
 * presentado» tardío (CLAUDE.md §4.bis).
 *
 * Un solo sitio para la escritura condicional y la cola de comisión de
 * las reservas en el local: los tres caminos no pueden divergir.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import { bookingLifecycleRepository } from './booking.lifecycle.repository';

/** Lo mínimo de la reserva que necesita el cierre. */
export interface CompletableBooking {
  id: string;
  providerId: string;
  commissionCents: number;
  paymentMode: 'online' | 'onsite';
}

/** Resultado de la escritura: `null` si la reserva ya no estaba en `from`. */
export type CommitCompletionOutcome = { onsiteCommissionChargeId: string | null } | null;

/** Escritura extra en la misma transacción, solo si la reserva cambió. */
export type CompletionHook = (tx: Prisma.TransactionClient) => Promise<unknown>;

/**
 * Completa la reserva en una transacción y, si era en el local, encola su
 * comisión (`amountCents = commissionCents`, congelada al reservar con la
 * tasa del plan; misma tasa que online, §4.bis).
 *
 * La llamada a Stripe (`itemizeCommission`) **no** va aquí: una llamada
 * de red no debe alargar la transacción, y si falla la fila queda en
 * `pending` para el reintento del cron.
 *
 * @param booking — reserva leída por el servicio.
 * @param from — estado de partida exigido (`confirmed` o `no_show`).
 * @param completedAt — instante del cierre.
 * @param onCompleted — escritura extra en la misma transacción (p. ej.
 *   revocar la sanción al deshacer un «no presentado» tardío).
 * @returns el id de la comisión encolada, o `null` si otra escritura se
 *   adelantó (0 filas: ya no estaba en `from`).
 */
export async function commitCompletion(
  booking: CompletableBooking,
  from: 'confirmed' | 'no_show',
  completedAt: Date,
  onCompleted?: CompletionHook,
): Promise<CommitCompletionOutcome> {
  return prisma.$transaction(async (tx) => {
    const changed = await bookingLifecycleRepository.complete(booking.id, from, completedAt, tx);
    if (changed === 0) return null;
    if (onCompleted) await onCompleted(tx);
    if (booking.paymentMode !== 'onsite') return { onsiteCommissionChargeId: null };
    const chargeId = await bookingLifecycleRepository.enqueueOnsiteCommission(
      {
        bookingId: booking.id,
        providerId: booking.providerId,
        amountCents: booking.commissionCents,
      },
      tx,
    );
    return { onsiteCommissionChargeId: chargeId };
  });
}
