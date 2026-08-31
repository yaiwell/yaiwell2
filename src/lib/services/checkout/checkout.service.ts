import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';
import { availabilityRepository } from '@/lib/services/availability';
import { bookingRepository, createBooking, ServiceNotFoundError } from '@/lib/services/booking';
import { getConnectAccountStatus } from '@/lib/services/payments';

import {
  PaymentIntentCreationError,
  ProfessionalNotResolvedError,
  ProviderNotChargeableError,
} from './checkout.errors';
import { checkoutRepository } from './checkout.repository';
import type { BookingCheckoutSession } from './checkout.types';
import { createBookingCheckoutSchema } from './checkout.validation';

/**
 * Servicio de cobro de reservas (Stripe Connect, destination charges).
 *
 * Elegimos **destination charge** y no direct charge: el cargo nace en
 * la cuenta de la plataforma y Stripe transfiere el neto al centro con
 * `transfer_data.destination`, reteniendo nuestra comisión vía
 * `application_fee_amount`. Es coherente con el `controller` que ya usa
 * `ensureConnectAccount` (pérdidas y fees a cargo de la plataforma) y
 * tiene una ventaja operativa clave: los webhooks llegan a la cuenta de
 * plataforma, así que no hay que enrutar eventos por `Stripe-Account`.
 */

/**
 * Divisa única del marketplace. Todos los proveedores son españoles en
 * Fase 1; cuando haya multi-divisa esto se derivará del país del
 * Provider, no de una constante.
 */
const CHECKOUT_CURRENCY = 'eur';

/**
 * Abre el checkout de una reserva: crea la reserva en `pending` y el
 * PaymentIntent que la pagará.
 *
 * El orden importa. Comprobamos que el proveedor **puede cobrar** antes
 * de crear nada en BD: si creásemos la reserva primero, un centro sin
 * Stripe conectado dejaría `pending` huérfanos bloqueando sus propios
 * slots. Y si Stripe falla después de crear la reserva, la cancelamos
 * para devolver el hueco al catálogo.
 *
 * Todo lo que afecta al dinero se resuelve en servidor desde BD: el
 * cliente sólo elige servicio y hora.
 *
 * @param input — payload crudo del cliente (validado con Zod).
 * @param clientId — `User.id` del cliente autenticado.
 * @throws ServiceNotFoundError — servicio inexistente, pausado o borrado.
 * @throws ProfessionalNotResolvedError — proveedor sin profesionales activos.
 * @throws ProviderNotChargeableError — el centro aún no puede cobrar.
 * @throws SlotUnavailableError — el hueco se ocupó mientras tanto.
 * @throws PaymentIntentCreationError — Stripe rechazó el intent.
 */
export async function createBookingCheckout(
  input: unknown,
  clientId: string,
): Promise<BookingCheckoutSession> {
  const data = createBookingCheckoutSchema.parse(input);

  const service = await availabilityRepository.findServiceForAvailability(data.serviceId);
  if (!service) {
    throw new ServiceNotFoundError();
  }

  // Mismo fallback que el motor de availability: si el servicio no tiene
  // profesional asignado (caso del autónomo), cae al primero activo del
  // proveedor. Así el slot que se mostró y el que se reserva salen del
  // mismo profesional.
  const professionalId =
    service.professionalId ??
    (await availabilityRepository.findFirstProfessionalIdForProvider(service.providerId));
  if (!professionalId) {
    throw new ProfessionalNotResolvedError();
  }

  const destinationAccountId = await resolveChargeableAccount(service.providerId);

  // `createBooking` aplica las reglas de negocio: antelación de 2 h,
  // servicio activo, ausencia de solapamiento, y congela precio y
  // comisión según el plan vigente del proveedor.
  const booking = await createBooking(
    {
      serviceId: data.serviceId,
      professionalId,
      slotStart: data.slotStartIso,
      notes: data.notes,
    },
    clientId,
  );

  let intent: Stripe.PaymentIntent;
  try {
    intent = await createDestinationPaymentIntent({
      bookingId: booking.id,
      providerId: booking.providerId,
      serviceId: booking.serviceId,
      clientId,
      amountCents: booking.priceCents,
      commissionCents: booking.commissionCents,
      destinationAccountId,
    });
  } catch (err) {
    await releaseBookingAfterFailedIntent(booking.id);
    throw err;
  }

  if (!intent.client_secret) {
    // Stripe siempre devuelve `client_secret` al crear; si falta, algo
    // muy raro pasa y no queremos entregar un checkout inservible.
    await releaseBookingAfterFailedIntent(booking.id);
    throw new PaymentIntentCreationError('Stripe no devolvió client_secret.');
  }

  await checkoutRepository.attachPaymentIntent(booking.id, intent.id);

  return {
    bookingId: booking.id,
    clientSecret: intent.client_secret,
    amountCents: booking.priceCents,
    slotStartIso: booking.startAt.toISOString(),
    slotEndIso: booking.endAt.toISOString(),
  };
}

/**
 * Verifica que el proveedor tiene cuenta conectada y que Stripe le
 * permite cobrar, y devuelve el id de esa cuenta.
 *
 * Cuesta una llamada a Stripe por checkout. La pagamos a propósito: sin
 * ella el fallo llegaría como un error genérico del PaymentIntent y el
 * cliente vería "algo ha fallado" en vez de "este centro todavía no
 * acepta reservas online".
 */
async function resolveChargeableAccount(providerId: string): Promise<string> {
  const payout = await checkoutRepository.findPayoutAccount(providerId);
  if (!payout?.stripeAccountId) {
    throw new ProviderNotChargeableError();
  }

  const status = await getConnectAccountStatus(payout.stripeAccountId);
  if (!status.chargesEnabled) {
    throw new ProviderNotChargeableError(
      'La cuenta Stripe del proveedor aún no tiene los cargos habilitados.',
    );
  }
  return payout.stripeAccountId;
}

/**
 * Crea el PaymentIntent con la comisión de plataforma y el destino.
 *
 * `idempotencyKey` derivada del `bookingId`: si el cliente reintenta el
 * checkout de la misma reserva (doble click, recarga), Stripe devuelve
 * el mismo intent en lugar de crear un segundo cargo.
 */
async function createDestinationPaymentIntent(args: {
  bookingId: string;
  providerId: string;
  serviceId: string;
  clientId: string;
  amountCents: number;
  commissionCents: number;
  destinationAccountId: string;
}): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();

  // Stripe rechaza una fee >= importe. `commissionCents` sale de
  // `Plan.commissionRateBps` y hoy nunca llega al 100%, pero un plan mal
  // sembrado no debe tumbar el cobro entero.
  const applicationFeeAmount = Math.max(0, Math.min(args.commissionCents, args.amountCents - 1));

  try {
    return await stripe.paymentIntents.create(
      {
        amount: args.amountCents,
        currency: CHECKOUT_CURRENCY,
        // Dejamos que Stripe decida los métodos según lo activado en el
        // dashboard (tarjeta, Apple/Google Pay, Bizum cuando llegue).
        automatic_payment_methods: { enabled: true },
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: args.destinationAccountId },
        // El webhook resuelve la reserva por esta metadata: más barato y
        // más fiable que buscar por `stripePaymentIntentId`.
        metadata: {
          bookingId: args.bookingId,
          providerId: args.providerId,
          serviceId: args.serviceId,
          clientId: args.clientId,
        },
      },
      { idempotencyKey: `booking_checkout_${args.bookingId}` },
    );
  } catch (err) {
    throw new PaymentIntentCreationError('Stripe rechazó la creación del PaymentIntent.', err);
  }
}

/**
 * Cancela la reserva recién creada cuando el cobro no ha podido
 * arrancar, para no dejar el slot bloqueado.
 *
 * Si la cancelación falla tampoco propagamos: el error relevante para el
 * usuario es el de Stripe, y un `pending` colgado es un problema de
 * limpieza, no de la petición en curso.
 */
async function releaseBookingAfterFailedIntent(bookingId: string): Promise<void> {
  try {
    await bookingRepository.updateStatus(bookingId, 'cancelled', { cancelledAt: new Date() });
  } catch (err) {
    console.error('[checkout] no se pudo liberar la reserva tras fallo de Stripe:', err);
  }
}
