/**
 * Cuerpo transaccional de `createBooking` para UN profesional concreto.
 *
 * Separado del servicio para poder repetirlo por cada candidato de una
 * reserva «cualquiera disponible»: cada intento va en su propia
 * transacción y solo bloquea a ese profesional.
 */
import type { Prisma } from '@prisma/client';

// Ruta directa: el barrel de `schedule-blocks` arrastra su servicio,
// que importa este dominio.
import { scheduleBlocksRepository } from '@/lib/services/schedule-blocks/schedule-blocks.repository';
import { findLiveOfferForSlot } from '@/lib/services/slot-offers';
import { computeCommissionCents, priceSlot } from '@/lib/utils/slot-offer-pricing';

import { SlotUnavailableError } from './booking.errors';
import { bookingRepository } from './booking.repository';
import type { CreateBookingOptions } from './booking.types';

/** Lo que no depende del profesional: se resuelve una vez antes de intentar. */
export interface BookForProfessionalContext {
  clientId: string;
  serviceId: string;
  providerId: string;
  /** Precio vigente del servicio (referencia del descuento). */
  servicePriceCents: number;
  commissionRateBps: number;
  slotStart: Date;
  endAt: Date;
  notes?: string;
  now: Date;
  paymentMode: 'online' | 'onsite';
  precondition?: CreateBookingOptions['precondition'];
}

/**
 * Crea la reserva para `professionalId` dentro de `tx`.
 *
 * Bajo un bloqueo por profesional hasta el fin de la transacción:
 *  1. Comprobación extra del caller (`precondition`, p. ej. pago en el local).
 *  2. Sin solape con reservas activas del profesional.
 *  3. Sin bloqueo de agenda que pise la franja.
 *  4. Precio con el descuento de su oferta viva en esa hora, si la hay,
 *     y comisión sobre lo cobrado.
 *
 * @throws SlotUnavailableError — solape o bloqueo de agenda. El caller
 *   lo usa para probar con el siguiente candidato.
 */
export async function bookForProfessional(
  tx: Prisma.TransactionClient,
  professionalId: string,
  ctx: BookForProfessionalContext,
) {
  // Dos clientes que reservan el mismo hueco a la vez (más probable en
  // un hueco liberado con descuento) se serializan, y el segundo ya ve
  // la reserva del primero en la comprobación de solape.
  await bookingRepository.lockProfessional(tx, professionalId);
  if (ctx.precondition) await ctx.precondition(tx);

  const overlapping = await bookingRepository.findOverlapping(
    professionalId,
    ctx.slotStart,
    ctx.endAt,
    ctx.now,
    tx,
  );
  if (overlapping.length > 0) {
    throw new SlotUnavailableError();
  }
  // Bajo el mismo bloqueo que toma `createScheduleBlock`: un bloqueo
  // de agenda creado mientras el cliente elegía hora gana.
  if (
    await scheduleBlocksRepository.hasActiveOverlap(professionalId, ctx.slotStart, ctx.endAt, tx)
  ) {
    throw new SlotUnavailableError();
  }

  // Hueco liberado con descuento: el % vigente se resuelve aquí, en
  // servidor, y se congela en la reserva (CLAUDE.md §4.bis).
  const offer = await findLiveOfferForSlot(
    professionalId,
    ctx.serviceId,
    ctx.slotStart,
    ctx.now,
    tx,
  );
  const price = priceSlot(ctx.servicePriceCents, offer?.discounts ?? null, ctx.slotStart, ctx.now);

  return bookingRepository.create(
    {
      clientId: ctx.clientId,
      serviceId: ctx.serviceId,
      professionalId,
      providerId: ctx.providerId,
      startAt: ctx.slotStart,
      endAt: ctx.endAt,
      priceCents: price.priceCents,
      // La comisión se calcula sobre lo que se cobra, con descuento o sin él.
      commissionCents: computeCommissionCents(price.priceCents, ctx.commissionRateBps),
      notes: ctx.notes,
      slotOfferId: price.discountPct !== null ? offer?.id : null,
      originalPriceCents: price.originalPriceCents,
      discountPct: price.discountPct,
      createdAt: ctx.now,
      status: ctx.paymentMode === 'onsite' ? 'confirmed' : 'pending',
      paymentMode: ctx.paymentMode,
    },
    tx,
  );
}
