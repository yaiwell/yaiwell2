import 'server-only';

import { OnsiteBookingTooLateError, createBooking } from '@/lib/services/booking';
import { getClientOnsiteEligibility } from '@/lib/services/sanctions';

import { OnsitePaymentNotAllowedError } from './checkout.errors';
import {
  isProviderOnsiteReady,
  resolvePaymentOptions,
  toOnsiteBlockReason,
} from './checkout.onsite';
import { onsiteRepository } from './checkout.onsite.repository';
import { resolveBookingTarget } from './checkout.target';
import type { OnsiteBookingResult, PaymentOptions } from './checkout.types';
import { createOnsiteBookingSchema, getPaymentOptionsSchema } from './checkout.validation';

/**
 * Reserva con pago en el local (CLAUDE.md §4.bis, decidido 2026-10-29 y
 * 2026-10-30).
 *
 * No hay Stripe en este camino: la reserva nace `confirmed` sin
 * PaymentIntent y el cliente paga en el negocio. Yaiwell cobra su
 * comisión al negocio cuando la reserva se completa (cola
 * `onsite_commission_charges`, Stripe Billing).
 */

/**
 * Calcula las opciones a partir del hueco: negocio, antelación y, si hay
 * cliente con sesión, su bloqueo por sanciones. Compartido por la
 * consulta de la UI y por la creación, para que no discrepen.
 */
async function computeOptions(
  providerId: string,
  slotStart: Date,
  clientId: string | null,
  now: Date,
): Promise<{ options: PaymentOptions; restrictedUntil: Date | null }> {
  const providerReady = isProviderOnsiteReady(
    await onsiteRepository.findProviderOnsiteStatus(providerId),
  );
  // Sin negocio dispuesto no hace falta mirar las sanciones del cliente.
  const eligibility =
    providerReady && clientId ? await getClientOnsiteEligibility(clientId, now) : null;
  const restrictedUntil = eligibility?.restrictedUntil ?? null;
  const options = resolvePaymentOptions({
    slotStart,
    now,
    providerReady,
    clientRestrictedUntil: restrictedUntil,
  });
  return { options, restrictedUntil };
}

/**
 * Métodos de pago disponibles para un hueco, para el paso de resumen.
 *
 * Es orientativo: `createOnsiteBooking` vuelve a comprobarlo todo al
 * reservar con su propio reloj.
 *
 * @param input — `{ serviceId, slotStartIso }` crudo (validado con Zod).
 * @param clientId — `User.id` del cliente con sesión, o `null` (no se
 *   puede saber si está bloqueado; se comprobará al reservar).
 * @param now — instante de referencia; inyectable para tests.
 * @throws ServiceNotFoundError | ProfessionalNotResolvedError
 */
export async function getPaymentOptions(
  input: unknown,
  clientId: string | null,
  now: Date = new Date(),
): Promise<PaymentOptions> {
  const data = getPaymentOptionsSchema.parse(input);
  const { providerId } = await resolveBookingTarget(data.serviceId);
  const { options } = await computeOptions(providerId, new Date(data.slotStartIso), clientId, now);
  return options;
}

/**
 * Crea una reserva con pago en el local.
 *
 * Orden: Zod → servicio y profesional → negocio dispuesto, antelación de
 * 2 h o más (a 2h00 justas se permite) y cliente no bloqueado → crear.
 * El mismo `now` llega a `createBooking`, que repite la regla de las 2 h
 * como red de seguridad: con un solo reloj no pueden discrepar.
 *
 * @param input — `{ serviceId, slotStartIso, notes? }` crudo.
 * @param clientId — `User.id` del cliente autenticado.
 * @param now — instante de referencia; inyectable para tests.
 * @throws OnsitePaymentNotAllowedError — `last_minute`, `provider` o
 *   `client_restricted` (con `restrictedUntil`).
 * @throws ServiceNotFoundError | ServicePausedError | ProfessionalNotResolvedError
 * @throws SlotUnavailableError — el hueco se ocupó mientras tanto.
 */
export async function createOnsiteBooking(
  input: unknown,
  clientId: string,
  now: Date = new Date(),
): Promise<OnsiteBookingResult> {
  const data = createOnsiteBookingSchema.parse(input);
  const slotStart = new Date(data.slotStartIso);
  const { providerId, professionalId } = await resolveBookingTarget(data.serviceId);

  const { options, restrictedUntil } = await computeOptions(providerId, slotStart, clientId, now);
  if (options.onsite !== 'available') {
    throw new OnsitePaymentNotAllowedError(
      toOnsiteBlockReason(options.onsite),
      options.onsite === 'client_restricted' ? restrictedUntil : null,
    );
  }

  let booking: Awaited<ReturnType<typeof createBooking>>;
  try {
    booking = await createBooking(
      { serviceId: data.serviceId, professionalId, slotStart, notes: data.notes },
      clientId,
      { paymentMode: 'onsite', now },
    );
  } catch (err) {
    if (err instanceof OnsiteBookingTooLateError) {
      throw new OnsitePaymentNotAllowedError('last_minute');
    }
    throw err;
  }

  return {
    bookingId: booking.id,
    paymentMode: 'onsite',
    amountCents: booking.priceCents,
    originalPriceCents: booking.originalPriceCents ?? null,
    discountPct: booking.discountPct ?? null,
    slotStartIso: booking.startAt.toISOString(),
    slotEndIso: booking.endAt.toISOString(),
  };
}
