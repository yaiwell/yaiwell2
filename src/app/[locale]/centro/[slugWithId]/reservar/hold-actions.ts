'use server';

import { auth } from '@clerk/nextjs/server';
import { ZodError } from 'zod';

import {
  BookingForCheckoutNotFoundError,
  BookingHoldExpiredError,
  checkBookingPayable,
} from '@/lib/services/checkout';
import { ensureUserFromClerk } from '@/lib/services/user';

/**
 * Server action de la comprobación previa al pago.
 *
 * Va en su propio fichero para que `actions.ts` no pase de las ~250
 * líneas. El formulario de pago la llama justo antes de
 * `stripe.confirmPayment`: si la reserva ya no retiene su franja, el
 * cliente se entera **antes** de que se le cobre.
 */

/**
 * Códigos de la comprobación.
 *
 *  - `HOLD_EXPIRED`: la retención venció (o la reserva ya no está viva).
 *  - `ALREADY_PAID`: ya está cobrada; la UI pasa a la confirmación.
 *  - `NOT_FOUND`: no existe o no es del usuario (no se distingue).
 *  - El resto son fallos de la propia comprobación, no de la reserva.
 */
export type BookingPayableErrorCode =
  | 'HOLD_EXPIRED'
  | 'ALREADY_PAID'
  | 'NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'VALIDATION'
  | 'INTERNAL';

/** Resultado serializable de `verifyBookingPayableAction`. */
export type BookingPayableActionState = { ok: true } | { ok: false; code: BookingPayableErrorCode };

/**
 * Comprueba en servidor que la reserva del usuario todavía se puede pagar.
 *
 * Si la retención venció, el servicio además caduca la reserva y cancela
 * su PaymentIntent, así que un pago posterior ya no puede entrar.
 *
 * @param input — `{ bookingId }`; se valida con Zod en el servicio.
 */
export async function verifyBookingPayableAction(
  input: unknown,
): Promise<BookingPayableActionState> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { ok: false, code: 'UNAUTHENTICATED' };
  }

  try {
    const user = await ensureUserFromClerk(clerkUserId);
    const payability = await checkBookingPayable(input, user.id);
    return payability === 'payable' ? { ok: true } : { ok: false, code: 'ALREADY_PAID' };
  } catch (error) {
    if (error instanceof BookingHoldExpiredError) return { ok: false, code: 'HOLD_EXPIRED' };
    if (error instanceof BookingForCheckoutNotFoundError) return { ok: false, code: 'NOT_FOUND' };
    if (error instanceof ZodError) return { ok: false, code: 'VALIDATION' };
    console.error('[reservar/hold-actions] error al comprobar la retención:', error);
    return { ok: false, code: 'INTERNAL' };
  }
}
