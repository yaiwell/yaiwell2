/**
 * Tipos del dominio de reservas.
 *
 * El `BookingStatus` se re-exporta directamente desde el cliente Prisma
 * para mantener una sola fuente de verdad: los valores válidos viven en
 * el enum del schema (`prisma/schema.prisma`).
 *
 * Los demás tipos son inputs/outputs específicos del servicio booking,
 * pensados para que las APIs y las server actions tipen sus contratos
 * sin acoplarse al modelo Prisma completo.
 */

import { BookingStatus } from '@prisma/client';

export { BookingStatus };

/**
 * Datos necesarios para crear una nueva reserva.
 *
 * `clientId` es el `User.id` del cliente autenticado y lo añade el
 * servicio a partir de la sesión Clerk; el resto llega del formulario
 * de checkout.
 */
export interface CreateBookingInput {
  clientId: string;
  serviceId: string;
  professionalId: string;
  slotStart: Date;
  notes?: string;
}

/**
 * Resumen mínimo de una reserva, pensado para listados y respuestas
 * de API donde no se quiere exponer todo el modelo.
 */
export interface BookingSummary {
  id: string;
  status: BookingStatus;
  startAt: Date;
  endAt: Date;
  priceCents: number;
}

/**
 * Datos de entrada para que un proveedor cancele una reserva desde
 * su panel. `providerUserId` se inyecta a partir de la sesión Clerk;
 * el servicio verifica que ese usuario es el dueño del Provider de
 * la reserva antes de aplicar la cancelación.
 */
export interface CancelBookingByProviderInput {
  bookingId: string;
  providerUserId: string;
}
