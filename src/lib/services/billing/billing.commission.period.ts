/**
 * Periodos de facturación de las comisiones del pago en el local.
 *
 * Módulo puro (sin Prisma ni Stripe). El periodo es el mes civil de
 * Madrid (`YYYY-MM`): es el que ve el negocio en su calendario y el que
 * usa la clave de idempotencia de la factura mensual.
 */
import { getMadridDateKey, getMadridDayRange } from '@/lib/utils/madrid-week';

/** Mes civil de Madrid en el que cae `instant` (`YYYY-MM`). */
export function getMadridPeriod(instant: Date): string {
  return getMadridDateKey(instant).slice(0, 7);
}

/** Primer instante del mes de Madrid de `instant` (00:00 del día 1). */
export function getMadridPeriodStart(instant: Date): Date {
  return getMadridDayRange(`${getMadridPeriod(instant)}-01`).start;
}

/**
 * Clave de idempotencia de la factura mensual de comisiones. Un reintento
 * del cron el mismo mes (o dos ejecuciones a la vez) recibe la misma
 * factura en vez de crear otra.
 */
export function commissionInvoiceIdempotencyKey(providerId: string, period: string): string {
  return `onsite-commission-invoice:${providerId}:${period}`;
}

/** Clave de idempotencia del concepto de comisión de una reserva. */
export function commissionItemIdempotencyKey(bookingId: string): string {
  return `onsite-commission:${bookingId}`;
}
