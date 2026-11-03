import type {
  CheckoutActionState,
  CreateBookingCheckoutActionInput,
} from '@/app/[locale]/centro/[slugWithId]/reservar/actions';
import { isLastMinuteBooking } from '@/lib/utils/booking-last-minute';

import type { BookingDraft, CheckoutState } from './BookingFlow.types';

/**
 * Transiciones del checkout que llevan datos de "última hora".
 *
 * Viven aparte de `useBookingFlow` para que ese hook no pase de las ~250
 * líneas y para poder probarlas sin montar React.
 */

/**
 * Estado `creating` con la estimación de "última hora" del navegador
 * CONGELADA en el momento de lanzar el checkout.
 *
 * Congelarla es lo que permite comparar luego con el valor del servidor
 * sin falsos positivos: el servidor decide con el `createdAt` de la
 * reserva, así que la estimación debe ser la del mismo instante, no la
 * de un reloj que sigue avanzando mientras el usuario paga.
 *
 * @param slotStartIso — hueco pedido.
 * @param now — instante de lanzamiento; parametrizable para tests.
 */
export function creatingCheckout(
  slotStartIso: string,
  now: Date = new Date(),
): Extract<CheckoutState, { status: 'creating' }> {
  return { status: 'creating', estimatedLastMinute: isLastMinuteBooking(slotStartIso, now) };
}

/**
 * Estado `ready` a partir de la respuesta OK de la action.
 *
 * Guarda el `slotStartIso` que devuelve el servidor (el de BD), que es
 * sobre el que se calcula la fecha límite de cancelación gratuita.
 *
 * @param result — respuesta OK de `createBookingCheckoutAction`.
 * @param estimatedLastMinute — estimación congelada al lanzar el checkout.
 */
export function readyCheckout(
  result: Extract<CheckoutActionState, { ok: true }>,
  estimatedLastMinute: boolean,
): CheckoutState {
  return {
    status: 'ready',
    bookingId: result.bookingId,
    clientSecret: result.clientSecret,
    amountCents: result.amountCents,
    originalPriceCents: result.originalPriceCents,
    discountPct: result.discountPct,
    isLastMinute: result.isLastMinute,
    estimatedLastMinute,
    slotStartIso: result.slotStartIso,
    professionalId: result.professionalId,
  };
}

/**
 * Entrada de `createBookingCheckoutAction` a partir del borrador.
 *
 * Con «cualquiera disponible» (`professionalId: null`) el campo no
 * viaja y el servidor asigna profesional dentro de la transacción.
 *
 * @param serviceId — servicio del flujo.
 * @param draft — borrador con hueco ya elegido.
 * @param slotStartIso — inicio del hueco (ya comprobado por el caller).
 */
export function buildCheckoutInput(
  serviceId: string,
  draft: BookingDraft,
  slotStartIso: string,
): CreateBookingCheckoutActionInput {
  return {
    serviceId,
    slotStartIso,
    ...(draft.professionalId && { professionalId: draft.professionalId }),
    notes: draft.notes.trim() || undefined,
  };
}
