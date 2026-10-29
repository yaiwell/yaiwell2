import { buildProviderSlugWithId } from '@/lib/utils/provider-slug';

import { bookingBaseDetails, bookingDetails } from './notifications.booking-details';
import { buildEmailUrl, formatEmailPrice } from './notifications.format';
import { getEmailTranslator } from './notifications.i18n';
import { closing, greet } from './notifications.template-helpers';
import type { BookingEmailContext, EmailContent } from './notifications.types';

/**
 * Reembolso que salió después de quedarse en trámite (cola de /admin o
 * devolución manual): cierra lo que el aviso anterior dejó abierto.
 */
export function buildRefundCompletedEmail(ctx: BookingEmailContext): EmailContent {
  const { locale } = ctx.client;
  const t = getEmailTranslator(locale);
  return {
    subject: t('refundCompleted.subject', { provider: ctx.provider.name }),
    heading: t('refundCompleted.heading'),
    greeting: greet(t, ctx.client),
    paragraphs: [
      t('refundCompleted.intro', {
        provider: ctx.provider.name,
        amount: formatEmailPrice(ctx.priceCents, locale),
      }),
    ],
    details: bookingBaseDetails(ctx, locale, t),
    cta: {
      label: t('refundCompleted.cta'),
      url: buildEmailUrl(locale, `/centro/${buildProviderSlugWithId(ctx.provider)}`),
    },
    ...closing(t),
  };
}

/** Recordatorio al cliente de la cita del día siguiente. */
export function buildBookingReminderEmail(ctx: BookingEmailContext): EmailContent {
  const { locale } = ctx.client;
  const t = getEmailTranslator(locale);
  return {
    subject: t('bookingReminder.subject', { provider: ctx.provider.name }),
    heading: t('bookingReminder.heading'),
    greeting: greet(t, ctx.client),
    paragraphs: [t('bookingReminder.intro', { provider: ctx.provider.name })],
    details: bookingDetails(ctx, locale, t),
    cta: { label: t('bookingReminder.cta'), url: buildEmailUrl(locale, '/mis-reservas') },
    ...closing(t),
  };
}
