/**
 * Retención temporal de franjas por reservas `pending`.
 *
 * Una reserva nace en `pending` para guardar el hueco mientras el
 * cliente paga. Si el pago nunca llega (pestaña cerrada, tarjeta
 * abandonada en el 3D Secure), esa `pending` no puede bloquear la franja
 * para siempre: pasado `PENDING_HOLD_MINUTES` deja de contar como
 * ocupada **de inmediato**, sin esperar al barrido diario del cron.
 *
 * Este fichero no importa Prisma en runtime (solo tipos): lo usan los
 * repositorios de `booking` y `availability` y el webhook de `checkout`,
 * y así la regla vive en un único sitio.
 */

import type { Prisma } from '@prisma/client';

/**
 * Minutos que una reserva `pending` retiene su franja.
 *
 * 30 min cubren con holgura un pago real con 3D Secure o un cambio de
 * método de pago, y a la vez son poco tiempo en un marketplace de
 * "disponible ahora": un hueco abandonado vuelve pronto al catálogo.
 * Si se cambia, revisar también la hora del cron de caducidad
 * (`vercel.json`) y los tests de `booking.hold.test.ts`.
 */
export const PENDING_HOLD_MINUTES = 30;

const PENDING_HOLD_MS = PENDING_HOLD_MINUTES * 60 * 1000;

/**
 * Margen al final de la retención en el que ya no se deja **empezar** a
 * pagar: un 3D Secure o un webhook lento pueden tardar más que lo que
 * queda, y el pago acabaría evaluándose con la retención vencida (con
 * reembolso automático si la franja se ocupó entretanto). Lo usa la
 * comprobación previa al pago de `checkout`.
 */
export const PENDING_HOLD_PAYMENT_MARGIN_MS = 2 * 60 * 1000;

/**
 * Instante de corte: una `pending` creada **antes** de este momento ya
 * no retiene su franja.
 *
 * @param now — instante de referencia; inyectable para tests.
 * @returns `now - PENDING_HOLD_MINUTES`.
 */
export function getPendingHoldCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - PENDING_HOLD_MS);
}

/**
 * Fragmento `where` de Prisma para "reserva que ocupa su franja":
 * `confirmed`, o `pending` creada dentro de la ventana de retención.
 *
 * Usa `OR` en la raíz: el caller debe combinarlo con spread y no
 * añadir otro `OR` en el mismo nivel (lo pisaría).
 *
 * @param now — instante de referencia; inyectable para tests.
 */
export function activeBookingWhere(now: Date = new Date()): Prisma.BookingWhereInput {
  return {
    OR: [
      { status: 'confirmed' },
      { status: 'pending', createdAt: { gte: getPendingHoldCutoff(now) } },
    ],
  };
}

/**
 * Equivalente en memoria de `activeBookingWhere` para una fila ya
 * cargada. Mismo criterio exacto, para que la BD y el webhook nunca
 * discrepen sobre si una reserva sigue reteniendo su hueco.
 */
export function isBookingHoldingSlot(
  booking: { status: string; createdAt: Date },
  now: Date = new Date(),
): boolean {
  if (booking.status === 'confirmed') return true;
  if (booking.status !== 'pending') return false;
  return booking.createdAt.getTime() >= getPendingHoldCutoff(now).getTime();
}
