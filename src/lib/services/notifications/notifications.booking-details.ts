import type { AppLocale } from '@/i18n/routing';
import { pickLocalized } from '@/lib/i18n';

import { formatEmailDateTime, formatEmailPrice } from './notifications.format';
import type { EmailTranslator } from './notifications.i18n';
import type { BookingEmailContext, EmailContent } from './notifications.types';

/** Qué, cuándo y dónde: lo mínimo para identificar la cita. */
export function bookingBaseDetails(
  ctx: BookingEmailContext,
  locale: AppLocale,
  t: EmailTranslator,
): EmailContent['details'] {
  return [
    { label: t('common.serviceLabel'), value: pickLocalized(ctx.serviceName, locale) },
    { label: t('common.whenLabel'), value: formatEmailDateTime(ctx.startAt, locale) },
    { label: t('common.whereLabel'), value: `${ctx.provider.name} · ${ctx.provider.address}` },
  ];
}

/**
 * Detalles de la cita en el idioma del destinatario. El importe muestra
 * el descuento con el precio habitual, igual que la confirmación web.
 */
export function bookingDetails(
  ctx: BookingEmailContext,
  locale: AppLocale,
  t: EmailTranslator,
): EmailContent['details'] {
  const details = bookingBaseDetails(ctx, locale, t);
  if (ctx.professionalName) {
    details.push({ label: t('common.professionalLabel'), value: ctx.professionalName });
  }
  const paid = formatEmailPrice(ctx.priceCents, locale);
  const value =
    ctx.discountPct && ctx.originalPriceCents
      ? `${paid} · ${t('common.discountNote', {
          pct: ctx.discountPct,
          original: formatEmailPrice(ctx.originalPriceCents, locale),
        })}`
      : paid;
  details.push({ label: t('common.paidLabel'), value });
  return details;
}
