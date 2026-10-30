import { createTranslator } from 'next-intl';

import type { AppLocale } from '@/i18n/routing';
import { pickLocalized } from '@/lib/i18n';
import ca from '@/messages/emails/ca.json';
import de from '@/messages/emails/de.json';
import en from '@/messages/emails/en.json';
import es from '@/messages/emails/es.json';
import { PANEL_TIMEZONE } from '@/lib/utils/madrid-week';
import type { LocalizedText } from '@/types/domain';

/**
 * Textos de las facturas de comisiones. Comparten diccionario con los
 * correos (`messages/emails/*.json`, clave `onsiteCommission`): se usan
 * fuera de una petición (cron, `after()`) y no deben viajar al navegador.
 */
const MESSAGES = { es, ca, en, de } as const satisfies Record<AppLocale, typeof es>;

function translator(locale: AppLocale) {
  return createTranslator({
    locale,
    // eslint-disable-next-line no-restricted-syntax -- diccionario con los 4 idiomas garantizados por `satisfies` y por el test de paridad de correos.
    messages: { emails: MESSAGES[locale] },
    namespace: 'emails.onsiteCommission',
  });
}

/**
 * Descripción del concepto de comisión de una reserva en la factura del
 * negocio, en el idioma del dueño: servicio y día de la cita (Madrid),
 * para que pueda cuadrarla con su calendario.
 */
export function buildCommissionItemDescription(
  locale: AppLocale,
  serviceName: LocalizedText,
  startAt: Date,
): string {
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: PANEL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(startAt);
  return translator(locale)('itemDescription', {
    service: pickLocalized(serviceName, locale),
    date,
  });
}

/** Descripción de la factura mensual suelta de comisiones. */
export function buildCommissionInvoiceDescription(locale: AppLocale): string {
  return translator(locale)('invoiceDescription');
}
