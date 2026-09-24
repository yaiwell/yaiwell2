/**
 * Schemas Zod para los inputs del servicio booking.
 *
 * La validación vive en este archivo y se aplica tanto en API routes
 * como en server actions: ningún borde del sistema debe confiar en
 * datos crudos.
 *
 * Decisiones:
 *  - `slotStart` exige al menos 2 horas de antelación. Es coherente
 *    con la política de cancelación del proveedor (§4.bis): si una
 *    reserva nace con menos de 2 h hasta el inicio, no podría
 *    cancelarse en ningún caso. Mejor bloquearlo al crear.
 *  - `notes` está limitado a 500 caracteres para que entre cómodo en
 *    un email transaccional y no requiera scroll en el panel.
 */

import { z } from 'zod';

import { MIN_BOOKING_LEAD_TIME_MS } from '@/lib/utils/booking-lead-time';

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  slotStart: z.coerce.date().refine((d) => d.getTime() > Date.now() + MIN_BOOKING_LEAD_TIME_MS, {
    message: 'La reserva debe ser con al menos 2 horas de antelación.',
  }),
  notes: z.string().max(500).optional(),
});

export type CreateBookingParsed = z.infer<typeof createBookingSchema>;

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
});

export type CancelBookingParsed = z.infer<typeof cancelBookingSchema>;
