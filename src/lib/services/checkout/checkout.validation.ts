/**
 * Schemas Zod del dominio `checkout`.
 *
 * El cliente sólo manda lo que puede conocer honestamente: qué servicio
 * quiere, a qué hora y una nota. Todo lo demás (profesional, precio,
 * comisión, proveedor) se resuelve en servidor desde BD — un cliente
 * que mande `priceCents` es un cliente que puede pagar 1 céntimo.
 */

import { z } from 'zod';

import {
  REFUND_DISMISS_REASON_MAX_LENGTH,
  REFUND_DISMISS_REASON_MIN_LENGTH,
} from '@/lib/utils/refund-dismiss-reason';

export const createBookingCheckoutSchema = z.object({
  serviceId: z.string().uuid(),
  /**
   * Instante de inicio en ISO 8601 con zona (lo que produce
   * `Date.toISOString()` en el SlotPicker). La regla de antelación
   * mínima de 30 min la aplica `createBookingSchema` aguas abajo; aquí
   * sólo garantizamos que es una fecha parseable.
   */
  slotStartIso: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export type CreateBookingCheckoutParsed = z.infer<typeof createBookingCheckoutSchema>;

/**
 * Entrada de la cancelación con reembolso.
 *
 * Sólo viaja el id de la reserva: quién cancela sale de la sesión
 * Clerk en el borde, nunca del payload. Duplicamos el schema en lugar
 * de reutilizar el de `booking` porque este módulo es el borde que
 * expone la server action del panel, y el dominio `booking` no debe
 * quedar acoplado al transporte del checkout.
 */
export const cancelBookingWithRefundSchema = z.object({
  bookingId: z.string().uuid(),
});

export type CancelBookingWithRefundParsed = z.infer<typeof cancelBookingWithRefundSchema>;

/**
 * Entrada del reintento manual de reembolso desde /admin. La
 * autorización (rol admin) la hace la server action en el borde.
 */
export const retryBookingRefundSchema = z.object({
  bookingId: z.string().uuid(),
});

export type RetryBookingRefundParsed = z.infer<typeof retryBookingRefundSchema>;

/**
 * Entrada de la comprobación previa al pago. El `bookingId` llega del
 * navegador; la titularidad sale de la sesión en el borde.
 */
export const verifyBookingPayableSchema = z.object({
  bookingId: z.string().uuid(),
});

/**
 * Entrada del descarte de una entrada de la cola de reembolsos desde
 * /admin. Quién descarta sale de la sesión, nunca del payload. El motivo
 * es obligatorio porque es lo único que explica después, en una
 * auditoría, por qué esa reserva salió de la cola sin `refundedAt`.
 */
export const dismissBookingRefundSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(REFUND_DISMISS_REASON_MIN_LENGTH)
    .max(REFUND_DISMISS_REASON_MAX_LENGTH),
});

export type DismissBookingRefundParsed = z.infer<typeof dismissBookingRefundSchema>;

/**
 * Reserva con pago en el local. Mismo contrato que el checkout online:
 * el cliente solo elige servicio, hora y nota; el resto sale de BD.
 */
export const createOnsiteBookingSchema = z.object({
  serviceId: z.string().uuid(),
  slotStartIso: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export type CreateOnsiteBookingParsed = z.infer<typeof createOnsiteBookingSchema>;

/** Consulta de los métodos de pago disponibles para un hueco. */
export const getPaymentOptionsSchema = z.object({
  serviceId: z.string().uuid(),
  slotStartIso: z.string().datetime(),
});

export type GetPaymentOptionsParsed = z.infer<typeof getPaymentOptionsSchema>;
