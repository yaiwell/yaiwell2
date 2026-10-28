import { z } from 'zod';

import { areValidSlotOfferDiscounts } from '@/lib/utils/slot-offer-pricing';

/**
 * Validación de entrada del dominio de huecos liberados.
 *
 * El cliente nunca manda precios ni horas de una reserva cancelada: el
 * hueco sale de la BD. Solo elige servicio y descuentos por tramo.
 */

const pct = z.number().int();

export const slotOfferDiscountsSchema = z
  .object({ over2h: pct, oneToTwoHours: pct, underOneHour: pct })
  .refine(areValidSlotOfferDiscounts, { message: 'invalid discounts' });

/** Liberar el hueco de una reserva cancelada. */
export const releaseCancelledSlotSchema = z.object({
  bookingId: z.string().min(1),
  /** Por defecto, el servicio de la reserva cancelada. */
  serviceId: z.string().min(1).optional(),
  discounts: slotOfferDiscountsSchema,
});

/** Liberar un hueco libre que empieza en menos de 2 h. */
export const releaseFreeSlotSchema = z.object({
  serviceId: z.string().min(1),
  startAt: z.coerce.date(),
  discounts: slotOfferDiscountsSchema,
});

export const withdrawSlotOfferSchema = z.object({
  offerId: z.string().min(1),
});
