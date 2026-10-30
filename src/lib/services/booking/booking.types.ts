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

/**
 * Cómo paga el cliente (migración 9f). Re-exportado del enum de Prisma
 * como tipo, igual que `BookingStatus`.
 */
export type { BookingPaymentMode } from '@prisma/client';

/** Opciones de `createBooking` que no llegan del formulario. */
export interface CreateBookingOptions {
  /**
   * `online` (por defecto): nace `pending` a la espera del pago.
   * `onsite`: nace `confirmed`, sin PaymentIntent ni retención.
   */
  paymentMode?: 'online' | 'onsite';
  /**
   * Instante de referencia compartido con el caller: así la regla de
   * última hora que comprobó `checkout` y la de aquí no discrepan en la
   * frontera de 2 h. Por defecto, `new Date()`.
   */
  now?: Date;
}

/**
 * Resultado de completar una reserva (a mano o por el cierre automático).
 * Si la reserva ya no estaba `confirmed` se lanza
 * `BookingNotConfirmedError`, así que el caller solo invita a valorar
 * cuando de verdad la ha completado él.
 *
 * `onsiteCommissionChargeId`: fila nueva de `onsite_commission_charges`
 * (status `pending`) si era una reserva en el local. El caller la pasa a
 * `itemizeCommission(chargeId)` (pieza B, Stripe Billing) **fuera** de la
 * transacción; si falla, el cron la reintenta desde `pending`.
 */
export interface CompleteBookingResult {
  bookingId: string;
  paymentMode: 'online' | 'onsite';
  onsiteCommissionChargeId: string | null;
}

/**
 * Resultado de marcar «no presentado».
 *
 * - `changed: false`: ya estaba marcada (doble clic); no se avisa otra vez.
 * - `sanctionApplied`: se ha creado (o reactivado) una sanción. Solo en
 *   reservas `onsite`; las online no sancionan (§4.bis).
 * - `eligibility`: estado del cliente tras la sanción, para el aviso
 *   «n de 3 en 12 meses» y «hasta el dd/mm solo online». `null` si no
 *   hubo sanción nueva.
 */
export interface NoShowResult {
  bookingId: string;
  clientId: string;
  changed: boolean;
  paymentMode: 'online' | 'onsite';
  sanctionApplied: boolean;
  eligibility: {
    sanctionsInWindow: number;
    restrictedUntil: Date | null;
  } | null;
}

/**
 * Resultado de deshacer «no presentado».
 *
 * - `status: 'confirmed'`: vuelve a estar pendiente de cerrar.
 * - `status: 'completed'`: ya habían pasado las 72 h, así que se completa
 *   en el acto (con comisión si era en el local, e invitación a valorar).
 *   El caller pasa `onsiteCommissionChargeId` a `itemizeCommission`.
 */
export interface UndoNoShowResult {
  bookingId: string;
  status: 'confirmed' | 'completed';
  sanctionRevoked: boolean;
  onsiteCommissionChargeId: string | null;
}

/** Resumen de una pasada del cierre automático de reservas en el local. */
export interface AutoCompleteOnsiteSummary {
  /** Reservas completadas en esta pasada: invitar a valorar. */
  completedBookingIds: string[];
  /** Comisiones encoladas: pasar a `itemizeCommission`. */
  commissionChargeIds: string[];
  /** Reservas que fallaron (se reintentan en la siguiente pasada). */
  failedBookingIds: string[];
}
