import type { AppLocale } from '@/i18n/routing';
import { toIntlLocale } from '@/lib/i18n';

/**
 * Formato de importes y fechas de las pantallas de reembolsos de /admin.
 * Sin `'use client'`: lo usan piezas de servidor y de cliente.
 */

// Las citas y los fallos se leen en hora peninsular: es la zona de los
// centros y la que usa soporte. Sin fijarla, en Vercel saldría en UTC.
const ADMIN_TIMEZONE = 'Europe/Madrid';

/**
 * Formatea un importe en céntimos como euros en el idioma activo.
 *
 * Siempre con dos decimales: en dinero pendiente de devolver el importe
 * exacto importa más que la limpieza visual.
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
