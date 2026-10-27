/**
 * Schemas Zod para los inputs del servicio booking.
 *
 * La validación vive en este archivo y se aplica tanto en API routes
 * como en server actions: ningún borde del sistema debe confiar en
 * datos crudos.
 *
 * Decisiones:
 *  - `slotStart` exige al menos 30 minutos de antelación
 *    (`MIN_BOOKING_LEAD_TIME_MS`). Es la misma constante que filtra el
 *    motor de disponibilidad, así que el selector nunca ofrece un hueco
 *    que aquí se rechazaría. Ver el porqué del valor en
 *    `lib/utils/booking-lead-time.ts`.
 *  - `notes` está limitado a 500 caracteres para que entre cómodo en
 *    un email transaccional y no requiera scroll en el panel.
 */

import { ZodError, z } from 'zod';

import { meetsMinBookingLeadTime } from '@/lib/utils/booking-lead-time';

/**
 * Marca que lleva el issue de Zod cuando el hueco no respeta la
 * antelación mínima. Permite a la capa de transporte distinguir este
 * rechazo (el usuario debe elegir otra hora) de un input malformado
 * sin parsear el texto del mensaje.
 */
export const BOOKING_TOO_SOON_ISSUE_CODE = 'BOOKING_TOO_SOON';

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  slotStart: z.coerce.date().refine((d) => meetsMinBookingLeadTime(d.getTime(), new Date()), {
    message: 'Booking must start at least 30 minutes from now.',
    params: { code: BOOKING_TOO_SOON_ISSUE_CODE },
  }),
  notes: z.string().max(500).optional(),
});

export type CreateBookingParsed = z.infer<typeof createBookingSchema>;

/**
 * Indica si un error de validación se debe a que el hueco ya no respeta
 * la antelación mínima.
 *
 * @param error — cualquier valor capturado en un `catch`.
 */
export function isBookingTooSoonError(error: unknown): boolean {
  if (!(error instanceof ZodError)) return false;
  return error.issues.some(
    (issue) =>
      issue.code === 'custom' &&
      (issue.params as { code?: unknown } | undefined)?.code === BOOKING_TOO_SOON_ISSUE_CODE,
  );
}

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
});

export type CancelBookingParsed = z.infer<typeof cancelBookingSchema>;
