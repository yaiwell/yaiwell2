/**
 * Schemas Zod del dominio `checkout`.
 *
 * El cliente sólo manda lo que puede conocer honestamente: qué servicio
 * quiere, a qué hora y una nota. Todo lo demás (profesional, precio,
 * comisión, proveedor) se resuelve en servidor desde BD — un cliente
 * que mande `priceCents` es un cliente que puede pagar 1 céntimo.
 */

import { z } from 'zod';

export const createBookingCheckoutSchema = z.object({
  serviceId: z.string().uuid(),
  /**
   * Instante de inicio en ISO 8601 con zona (lo que produce
   * `Date.toISOString()` en el SlotPicker). La regla de antelación
   * mínima de 2 h la aplica `createBookingSchema` aguas abajo; aquí
   * sólo garantizamos que es una fecha parseable.
   */
  slotStartIso: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export type CreateBookingCheckoutParsed = z.infer<typeof createBookingCheckoutSchema>;
