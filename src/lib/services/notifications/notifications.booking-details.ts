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
 * el descuento con el precio habitual, igual que la confirmación web, y
 * se rotula «a pagar en el local» si la reserva no se pagó online.
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
  // En el local no se ha cobrado nada: el importe es lo que se pagará allí.
  const label = ctx.paymentMode === 'onsite' ? t('common.payAtVenueLabel') : t('common.paidLabel');
  details.push({ label, value });
  return details;
}
