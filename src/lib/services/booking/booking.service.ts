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

import {
  BookingNotConfirmedError,
  BookingNotFoundError,
  BookingTooLateToCancelError,
  ServiceNotFoundError,
  SlotUnavailableError,
  UnauthorizedCancellationError,
} from './booking.errors';
import { bookingRepository } from './booking.repository';
import { cancelBookingSchema, createBookingSchema } from './booking.validation';

/**
 * Margen mínimo (ms) entre `now` y `startAt` para que el proveedor
 * pueda cancelar la reserva. Coincide con la antelación mínima
 * requerida al crear, en `booking.validation.ts`.
 */
const CANCELLATION_LEAD_TIME_MS = 2 * 60 * 60 * 1000;

/**
 * Crea una reserva en estado `pending`.
 *
 * Pasos:
 *  1. Valida la entrada con Zod (incluye la regla de antelación mínima).
 *  2. Carga el servicio para conocer duración y precio.
 *  3. Calcula `endAt = slotStart + durationMinutes`.
 *  4. Verifica que no haya solapamiento con otras reservas activas.
 *  5. Calcula la comisión a partir del plan del proveedor.
 *  6. Persiste la reserva.
 *
 * Congelamos `priceCents` y `commissionCents` en el momento de la
 * reserva para que cambios posteriores de precio o plan no afecten
 * a reservas pasadas.
 *
 * @param input — datos crudos del cliente (validados con Zod).
 * @param clientId — id del usuario autenticado (`User.id`).
 * @throws ServiceNotFoundError — si el servicio no existe.
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
  if (!service) {
    throw new ServiceNotFoundError();
  }

  // Calculamos el cierre del slot a partir de la duración del servicio.
  const endAt = new Date(data.slotStart.getTime() + service.durationMinutes * 60_000);

  const overlapping = await bookingRepository.findOverlapping(
    data.professionalId,
    data.slotStart,
    endAt,
  );
  if (overlapping.length > 0) {
    throw new SlotUnavailableError();
  }

  // Comisión en céntimos, redondeada hacia abajo. `commissionRateBps`
  // está en centésimas de porcentaje (800 = 8.00%).
  const commissionCents = Math.floor(
    (service.priceCents * service.provider.plan.commissionRateBps) / 10_000,
  );

  return bookingRepository.create({
    clientId,
    serviceId: data.serviceId,
    professionalId: data.professionalId,
    providerId: service.providerId,
    startAt: data.slotStart,
    endAt,
    priceCents: service.priceCents,
    commissionCents,
    notes: data.notes,
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
 * @throws BookingNotFoundError — si la reserva no existe.
 * @throws UnauthorizedCancellationError — si el usuario no es dueño.
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

  // Verificamos la ventana de 2 horas frente a `now`.
  const msUntilStart = booking.startAt.getTime() - Date.now();
  if (msUntilStart < CANCELLATION_LEAD_TIME_MS) {
    throw new BookingTooLateToCancelError();
  }

  return bookingRepository.updateStatus(bookingId, 'cancelled', {
    cancelledAt: new Date(),
  });
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
