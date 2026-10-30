/**
 * Reglas puras del pago en el local (CLAUDE.md §4.bis, decidido
 * 2026-10-29 y 2026-10-30). Sin BD ni Stripe: las usan `getPaymentOptions`
 * (qué enseña la UI) y `createOnsiteBooking` (qué acepta el servidor),
 * así que nunca discrepan.
 */

import { isOnsiteAllowedByLeadTime, isOnsiteLimitReached } from '@/lib/utils/booking-payment-mode';

import type { OnsitePaymentBlockReason } from './checkout.errors';
import type { OnsitePaymentOption, PaymentOptions } from './checkout.types';

/** Lo que decide si un negocio admite ahora pago en el local. */
export interface ProviderOnsiteStatus {
  acceptsOnsitePayment: boolean;
  /** `null` si el negocio no tiene fila de facturación. */
  billing: {
    onsitePaymentMethodReadyAt: Date | null;
    commissionDebtSince: Date | null;
  } | null;
}

/**
 * Un negocio admite pago en el local si lo ha activado, tiene método de
 * pago guardado para las comisiones y no tiene comisiones impagadas.
 */
export function isProviderOnsiteReady(status: ProviderOnsiteStatus | null): boolean {
  if (!status?.acceptsOnsitePayment || !status.billing) return false;
  return (
    status.billing.onsitePaymentMethodReadyAt !== null &&
    status.billing.commissionDebtSince === null
  );
}

/** Entradas ya resueltas para decidir los métodos de pago. */
export interface PaymentOptionsInput {
  slotStart: Date;
  now: Date;
  providerReady: boolean;
  /** Bloqueo vigente del cliente, o `null` (sin bloqueo o sin sesión). */
  clientRestrictedUntil: Date | null;
  /**
   * Reservas futuras del cliente ya en el local (`confirmed`, sin
   * empezar). 0 sin sesión: se comprobará al reservar.
   */
  clientActiveOnsiteBookings: number;
}

/**
 * Métodos de pago para un hueco. Orden de las comprobaciones:
 *  1. Negocio: si no lo ofrece, la opción ni se enseña.
 *  2. Antelación: a menos de 2 h es última hora, solo online (a 2h00
 *     justas se permite).
 *  3. Cliente: bloqueado por sanciones hasta `restrictedUntil`.
 *  4. Cliente: ya tiene el tope de reservas futuras en el local (antiabuso,
 *     2026-10-30). Va después del bloqueo porque este dice hasta cuándo.
 */
export function resolvePaymentOptions(input: PaymentOptionsInput): PaymentOptions {
  const onsite = resolveOnsiteOption(input);
  return {
    online: 'available',
    onsite,
    restrictedUntilIso:
      onsite === 'client_restricted' && input.clientRestrictedUntil
        ? input.clientRestrictedUntil.toISOString()
        : null,
  };
}

function resolveOnsiteOption(input: PaymentOptionsInput): OnsitePaymentOption {
  if (!input.providerReady) return 'not_offered';
  if (!isOnsiteAllowedByLeadTime(input.slotStart, input.now)) return 'last_minute';
  if (input.clientRestrictedUntil) return 'client_restricted';
  if (isOnsiteLimitReached(input.clientActiveOnsiteBookings)) return 'limit_reached';
  return 'available';
}

/** Traduce una opción no disponible al motivo del error de dominio. */
export function toOnsiteBlockReason(
  option: Exclude<OnsitePaymentOption, 'available'>,
): OnsitePaymentBlockReason {
  return option === 'not_offered' ? 'provider' : option;
}
