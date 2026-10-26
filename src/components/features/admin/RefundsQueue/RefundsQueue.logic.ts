import type { AppLocale } from '@/i18n/routing';
import { toIntlLocale } from '@/lib/i18n';

/**
 * Helpers puros de formato de la cola de reembolsos.
 *
 * Sin `'use client'`: la cola se renderiza en el servidor y estos
 * helpers no dependen del navegador.
 */

// Las citas y los fallos se leen en hora peninsular: es la zona de los
// centros y la que usa soporte. Sin fijarla, en Vercel saldría en UTC.
const ADMIN_TIMEZONE = 'Europe/Madrid';

const STRIPE_PAYMENTS_URL = 'https://dashboard.stripe.com/payments';

/**
 * Formatea un importe en céntimos como euros en el idioma activo.
 *
 * Siempre con dos decimales: en una cola de dinero pendiente el
 * importe exacto importa más que la limpieza visual.
 */
export function formatRefundAmount(cents: number, locale: AppLocale): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Formatea fecha y hora (día, mes abreviado, año y hora) en hora peninsular. */
export function formatRefundDateTime(date: Date, locale: AppLocale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ADMIN_TIMEZONE,
  }).format(date);
}

/**
 * Enlace al PaymentIntent en el dashboard de Stripe.
 *
 * El dashboard decide si abre el modo test o el live según la sesión de
 * quien lo abre, así que no distinguimos entornos aquí.
 */
export function buildStripePaymentUrl(paymentIntentId: string): string {
  return `${STRIPE_PAYMENTS_URL}/${encodeURIComponent(paymentIntentId)}`;
}
