import type { AppLocale } from '@/i18n/routing';
import { toIntlLocale } from '@/lib/i18n';
import { SITE_URL } from '@/lib/seo/site-url';

/** Zona del negocio: las horas del correo deben coincidir con las del local. */
const EMAIL_TIMEZONE = 'Europe/Madrid';

/** Fecha y hora de la cita en el idioma del destinatario, hora de Madrid. */
export function formatEmailDateTime(date: Date, locale: AppLocale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: EMAIL_TIMEZONE,
  }).format(date);
}

/** Importe en euros a partir de céntimos. */
export function formatEmailPrice(cents: number, locale: AppLocale): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

/**
 * URL absoluta a una página de la web en el idioma del destinatario.
 *
 * @param path — ruta sin prefijo de idioma, empezando por `/`.
 */
export function buildEmailUrl(locale: AppLocale, path: string): string {
  return `${SITE_URL}/${locale}${path}`;
}
