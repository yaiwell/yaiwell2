'use server';

import { auth } from '@clerk/nextjs/server';
import { ZodError } from 'zod';

import {
  ServiceNotFoundError,
  ServicePausedError,
  SlotUnavailableError,
} from '@/lib/services/booking';
import {
  PaymentIntentCreationError,
  ProfessionalNotResolvedError,
  ProviderNotChargeableError,
  createBookingCheckout,
} from '@/lib/services/checkout';
import { StripeOperationError } from '@/lib/services/payments';
import { ensureUserFromClerk } from '@/lib/services/user';

/**
 * Server action que abre el checkout de una reserva.
 *
 * Es el único borde por el que el navegador puede iniciar un cobro. No
 * acepta importes ni profesional: sólo qué servicio y a qué hora. El
 * resto (precio, comisión, cuenta de destino) lo resuelve el service
 * contra BD, porque un cliente que pudiera mandar `priceCents` sería un
 * cliente que puede pagar un céntimo.
 */

/**
 * Códigos de error que la UI traduce a copy localizado.
 *
 * Opacos a propósito: no filtramos mensajes de Stripe ni de Prisma al
 * navegador. Cada uno tiene una acción distinta del lado del usuario, y
 * por eso no se colapsan en un genérico.
 */
export type CheckoutErrorCode =
  | 'UNAUTHENTICATED'
  | 'VALIDATION'
  | 'SERVICE_UNAVAILABLE'
  | 'SLOT_UNAVAILABLE'
  | 'PROVIDER_NOT_CHARGEABLE'
  | 'PAYMENT_FAILED'
  | 'INTERNAL';

/**
 * Resultado serializable de `createBookingCheckoutAction`.
 *
 * `clientSecret` viaja al navegador por diseño: sólo autoriza a
 * confirmar ese PaymentIntent concreto, que es exactamente lo que el
 * dueño de la reserva necesita hacer.
 */
export type CheckoutActionState =
  | {
      ok: true;
      bookingId: string;
      clientSecret: string;
      amountCents: number;
      slotStartIso: string;
      slotEndIso: string;
    }
  | { ok: false; code: CheckoutErrorCode };

/**
 * Entrada del checkout tal y como la manda el flujo de reserva.
 *
 * Se tipa aquí para que el Client Component tenga autocompletado, pero
 * la validación real la hace Zod dentro del service: una server action
 * es un endpoint público y su firma TypeScript no la protege.
 */
export interface CreateBookingCheckoutActionInput {
  serviceId: string;
  slotStartIso: string;
  notes?: string;
}

/**
 * Crea la reserva en `pending` y devuelve el `clientSecret` con el que
 * el navegador monta Stripe Elements.
 *
 * La reserva **no** queda confirmada al volver de aquí: pasa a
 * `confirmed` cuando llega `payment_intent.succeeded` al webhook. Esa
 * asimetría es deliberada — si el usuario cierra la pestaña justo tras
 * pagar, el dinero manda y la reserva se confirma igual.
 *
 * @param input — servicio, hora y notas elegidos por el cliente.
 */
export async function createBookingCheckoutAction(
  input: CreateBookingCheckoutActionInput,
): Promise<CheckoutActionState> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { ok: false, code: 'UNAUTHENTICATED' };
  }

  // El flujo de reserva es público hasta el pago, así que un cliente
  // puede llegar aquí sin fila en `users` todavía (alta reciente, o
  // webhook de Clerk perdido). `ensureUserFromClerk` la crea si falta.
  const user = await ensureUserFromClerk(clerkUserId);

  try {
    const session = await createBookingCheckout(input, user.id);
    return {
      ok: true,
      bookingId: session.bookingId,
      clientSecret: session.clientSecret,
      amountCents: session.amountCents,
      slotStartIso: session.slotStartIso,
      slotEndIso: session.slotEndIso,
    };
  } catch (error) {
    return { ok: false, code: mapCheckoutError(error) };
  }
}

/**
 * Traduce los errores tipados del dominio a códigos de UI.
 *
 * Se separa del cuerpo de la action para que ésta se lea de un vistazo
 * y para poder testear el mapeo sin montar sesión de Clerk.
 */
function mapCheckoutError(error: unknown): CheckoutErrorCode {
  if (error instanceof ZodError) {
    return 'VALIDATION';
  }
  // Servicio borrado, pausado o sin profesional al que asignarlo: desde
  // la perspectiva del cliente son el mismo problema, "esto ya no se
  // puede reservar".
  if (
    error instanceof ServiceNotFoundError ||
    error instanceof ServicePausedError ||
    error instanceof ProfessionalNotResolvedError
  ) {
    return 'SERVICE_UNAVAILABLE';
  }
  if (error instanceof SlotUnavailableError) {
    return 'SLOT_UNAVAILABLE';
  }
  if (error instanceof ProviderNotChargeableError) {
    return 'PROVIDER_NOT_CHARGEABLE';
  }
  if (error instanceof PaymentIntentCreationError || error instanceof StripeOperationError) {
    console.error('[reservar/actions] Stripe rechazó el checkout:', error.cause ?? error);
    return 'PAYMENT_FAILED';
  }
  console.error('[reservar/actions] error inesperado al abrir el checkout:', error);
  return 'INTERNAL';
}
