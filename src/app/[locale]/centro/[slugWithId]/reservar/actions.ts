'use server';

import { auth } from '@clerk/nextjs/server';
import { z, ZodError } from 'zod';

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
  getBookingForConfirmation,
} from '@/lib/services/checkout';
import { StripeOperationError } from '@/lib/services/payments';
import { ensureUserFromClerk } from '@/lib/services/user';
import { isBookingPaymentSettled } from '@/lib/utils/booking-payment-status';

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
 * Entrada de `getBookingStatusAction`.
 *
 * Una server action es un endpoint público: el `bookingId` llega del
 * navegador y se valida con Zod antes de tocar BD, igual que el resto de
 * bordes del sistema.
 */
const bookingStatusInputSchema = z.object({
  bookingId: z.string().uuid(),
});

/** Códigos de error de la consulta de estado. */
export type BookingStatusErrorCode = 'UNAUTHENTICATED' | 'NOT_FOUND' | 'VALIDATION' | 'INTERNAL';

/**
 * Resultado de consultar el estado de una reserva propia.
 *
 * `isConfirmed` se calcula en servidor a propósito: qué estados cuentan
 * como "reserva confirmada" es una decisión de negocio, y la UI no debe
 * reimplementarla comparando strings.
 */
export type BookingStatusActionState =
  | { ok: true; bookingId: string; status: string; isConfirmed: boolean }
  | { ok: false; code: BookingStatusErrorCode };

/**
 * Devuelve el estado real de una reserva del usuario autenticado.
 *
 * Existe para que el camino **sin 3DS** del flujo de reserva pueda decir
 * la verdad. Hasta ahora, ese camino pintaba "¡Reserva confirmada!" en
 * cuanto `confirmPayment` resolvía, cuando quien confirma la reserva es
 * el webhook `payment_intent.succeeded` y puede tardar unos segundos. La
 * página dedicada `/confirmacion` (la del retorno de 3DS) ya leía el
 * estado de BD; esta action le da la misma fuente de verdad al camino
 * que se quedó fuera.
 *
 * No hace polling ni espera: devuelve la foto actual. Insistir es
 * decisión del llamante.
 *
 * @param input — `{ bookingId }` de la reserva a consultar.
 */
export async function getBookingStatusAction(input: unknown): Promise<BookingStatusActionState> {
  const parsed = bookingStatusInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION' };
  }

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { ok: false, code: 'UNAUTHENTICATED' };
  }

  try {
    const user = await ensureUserFromClerk(clerkUserId);
    // `getBookingForConfirmation` ya comprueba titularidad: devuelve
    // `null` tanto si la reserva no existe como si es de otro cliente,
    // sin distinguir, para no filtrar reservas ajenas.
    const booking = await getBookingForConfirmation(parsed.data.bookingId, user.id);
    if (!booking) {
      return { ok: false, code: 'NOT_FOUND' };
    }
    return {
      ok: true,
      bookingId: booking.id,
      status: booking.status,
      isConfirmed: isBookingPaymentSettled(booking.status),
    };
  } catch (error) {
    console.error('[reservar/actions] error al consultar el estado de la reserva:', error);
    return { ok: false, code: 'INTERNAL' };
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
