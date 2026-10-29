/**
 * Servicio de reservas.
 *
 * Orquesta el repositorio de bookings con las reglas de negocio
 * descritas en §4.bis de CLAUDE.md:
 *  - Cancelación por proveedor solo si faltan >=2 h hasta `startAt`.
 *  - Solo el dueño del Provider puede cancelar/completar.
 *  - El paso a `completed` solo se permite desde `confirmed`.
 *
 * Toda entrada externa se valida con Zod antes de tocar la BD. Los
 * errores son clases tipadas para que la capa de transporte mapee
 * a códigos HTTP sin parsear mensajes.
 */

import { prisma } from '@/lib/db/prisma';
import { findLiveOfferForSlot, isBookableStart } from '@/lib/services/slot-offers';
import { computeCommissionCents, priceSlot } from '@/lib/utils/slot-offer-pricing';

import {
  assertCancellableStatus,
  assertCancellationWindow,
  commitCancellation,
} from './booking.cancel';
import {
  BookingNotConfirmedError,
  BookingNotFoundError,
  ServiceNotFoundError,
  ServicePausedError,
  SlotUnavailableError,
  UnauthorizedCancellationError,
} from './booking.errors';
import { bookingRepository } from './booking.repository';
import { cancelBookingSchema, createBookingSchema } from './booking.validation';

/**
 * Crea una reserva en estado `pending`.
 *
 * Pasos:
 *  1. Valida la entrada con Zod (incluye la regla de antelación mínima).
 *  2. Carga el servicio para conocer duración y precio.
 *  3. Calcula `endAt = slotStart + durationMinutes`.
 *  4. Bajo un bloqueo por profesional, verifica que no haya solapamiento
 *     con otras reservas activas.
 *  5. Aplica el descuento de un hueco liberado, si lo hay, y calcula la
 *     comisión sobre el precio cobrado.
 *  6. Persiste la reserva en la misma transacción.
 *
 * Congelamos `priceCents` y `commissionCents` en el momento de la
 * reserva para que cambios posteriores de precio o plan no afecten
 * a reservas pasadas.
 *
 * @param input — datos crudos del cliente (validados con Zod).
 * @param clientId — id del usuario autenticado (`User.id`).
 * @throws ServiceNotFoundError — si el servicio no existe o está soft-deleted.
 * @throws ServicePausedError — si el servicio está pausado por el dueño.
 * @throws SlotUnavailableError — si el slot solapa con otra reserva activa.
 */
export async function createBooking(input: unknown, clientId: string) {
  const data = createBookingSchema.parse(input);

  // Cargamos el servicio con el proveedor + plan para conocer la
  // duración, el precio y la comisión a aplicar.
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
    include: { provider: { include: { plan: true } } },
  });
  if (!service || service.deletedAt) {
    throw new ServiceNotFoundError();
  }
  // Bloqueamos reservas sobre servicios pausados aunque el caller llegue
  // con un slug viejo o un deeplink en caché: la fuente de verdad es la BD.
  if (!service.isActive) {
    throw new ServicePausedError();
  }

  // Calculamos el cierre del slot a partir de la duración del servicio.
  const endAt = new Date(data.slotStart.getTime() + service.durationMinutes * 60_000);

  // Un único instante para el tramo de descuento y para `createdAt`, del
  // que sale la regla de última hora: así nunca se contradicen en la
  // frontera de 2 h.
  const now = new Date();

  // Solo aceptamos horas que ofrecemos: de la rejilla del motor o
  // liberadas con descuento. Sin esto una llamada directa podría
  // reservar fuera de horario o una hora que la UI nunca enseñó.
  if (!(await isBookableStart(data.serviceId, data.professionalId, data.slotStart, now))) {
    throw new SlotUnavailableError();
  }

  return prisma.$transaction(async (tx) => {
    // Bloqueo por profesional hasta el fin de la transacción: dos
    // clientes que reservan el mismo hueco a la vez (más probable en un
    // hueco liberado con descuento) se serializan, y el segundo ya ve
    // la reserva del primero en la comprobación de solape.
    await bookingRepository.lockProfessional(tx, data.professionalId);

    const overlapping = await bookingRepository.findOverlapping(
      data.professionalId,
      data.slotStart,
      endAt,
      now,
      tx,
    );
    if (overlapping.length > 0) {
      throw new SlotUnavailableError();
    }

    // Hueco liberado con descuento: el % vigente se resuelve aquí, en
    // servidor, y se congela en la reserva (CLAUDE.md §4.bis).
    const offer = await findLiveOfferForSlot(
      data.professionalId,
      data.serviceId,
      data.slotStart,
      now,
      tx,
    );
    const price = priceSlot(service.priceCents, offer?.discounts ?? null, data.slotStart, now);

    return bookingRepository.create(
      {
        clientId,
        serviceId: data.serviceId,
        professionalId: data.professionalId,
        providerId: service.providerId,
        startAt: data.slotStart,
        endAt,
        priceCents: price.priceCents,
        // La comisión se calcula sobre lo que se cobra, con descuento o sin él.
        commissionCents: computeCommissionCents(
          price.priceCents,
          service.provider.plan.commissionRateBps,
        ),
        notes: data.notes,
        slotOfferId: price.discountPct !== null ? offer?.id : null,
        originalPriceCents: price.originalPriceCents,
        discountPct: price.discountPct,
        createdAt: now,
      },
      tx,
    );
  });
}

/**
 * Cancela una reserva desde el panel del proveedor.
 *
 * Solo el dueño del `Provider` puede cancelar, y únicamente si
 * faltan al menos 2 horas hasta el inicio del slot. A menos de 2 h
 * la cancelación queda bloqueada en API para dar al cliente margen
 * real de buscar alternativa.
 *
 * @param input — datos crudos validados con Zod.
 * @param providerUserId — `User.id` del proveedor autenticado.
 * @returns la reserva ya cancelada más `previousStatus` (`pending` o
 *   `confirmed`), el estado que tenía en la lectura de este servicio.
 * @throws BookingNotFoundError — si la reserva no existe.
 * @throws UnauthorizedCancellationError — si el usuario no es dueño.
 * @throws BookingNotCancellableError — si el estado actual no admite
 *   cancelación (ya cancelada, reembolsada o completada), también si
 *   cambió en paralelo antes de escribir.
 * @throws BookingTooLateToCancelError — si faltan menos de 2 h.
 */
export async function cancelBookingByProvider(input: unknown, providerUserId: string) {
  const { bookingId } = cancelBookingSchema.parse(input);

  const booking = await bookingRepository.findById(bookingId);
  if (!booking) {
    throw new BookingNotFoundError();
  }

  // Solo el dueño del Provider asociado a la reserva puede cancelar.
  if (booking.provider.userId !== providerUserId) {
    throw new UnauthorizedCancellationError();
  }

  // Estado antes que ventana: ver `assertCancellableStatus`. La ventana
  // de 2 h ya no coincide con la antelación mínima al crear (30 min): una
  // reserva de última hora nace dentro de ella y no es cancelable.
  const now = new Date();
  assertCancellableStatus(booking);
  assertCancellationWindow(booking, now);

  // El centro retira la oferta de origen: decide él si vuelve a liberar.
  return commitCancellation(booking, now, { retireOffer: true });
}

/**
 * Marca una reserva como completada desde el panel del proveedor.
 *
 * Es el evento que desbloquea la valoración para el cliente (§4.bis).
 * Reglas:
 *  - Solo el dueño del Provider asociado puede marcarla.
 *  - Solo se permite la transición `confirmed` -> `completed`. No se
 *    salta `confirmed` desde `pending` para no marcar como atendida
 *    una reserva que aún no se ha pagado.
 *
 * @throws BookingNotFoundError — si la reserva no existe.
 * @throws UnauthorizedCancellationError — si el usuario no es dueño
 *   (reutilizamos el error porque la regla de titularidad es la misma).
 * @throws BookingNotConfirmedError — si el estado actual no es
 *   `confirmed`.
 */
export async function markBookingCompleted(bookingId: string, providerUserId: string) {
  const booking = await bookingRepository.findById(bookingId);
  if (!booking) {
    throw new BookingNotFoundError();
  }

  if (booking.provider.userId !== providerUserId) {
    throw new UnauthorizedCancellationError();
  }

  if (booking.status !== 'confirmed') {
    throw new BookingNotConfirmedError();
  }

  return bookingRepository.updateStatus(bookingId, 'completed', {
    completedAt: new Date(),
  });
}
