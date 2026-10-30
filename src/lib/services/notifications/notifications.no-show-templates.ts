import { bookingBaseDetails } from './notifications.booking-details';
import { SUPPORT_EMAIL, formatEmailPrice, formatEmailShortDate } from './notifications.format';
import { getEmailTranslator } from './notifications.i18n';
import { closing, greet } from './notifications.template-helpers';
import type { BookingEmailContext, EmailContent, NoShowNotice } from './notifications.types';

/**
 * Aviso al cliente de que el negocio le ha marcado «no presentado»
 * (§4.bis, decidido 2026-10-29):
 *  - pagada online: no hay devolución ni sanción;
 *  - en el local: 1 sanción, cuántas lleva en 12 meses y, si con esta
 *    llega a 3, hasta cuándo solo podrá reservar pagando online.
 * Siempre con la vía a soporte por si es un error.
 *
 * @param notice — sanción aplicada y estado del cliente tras aplicarla.
 */
export function buildNoShowEmail(ctx: BookingEmailContext, notice: NoShowNotice): EmailContent {
  const { locale } = ctx.client;
  const t = getEmailTranslator(locale);
  const paragraphs = [t('noShow.intro', { provider: ctx.provider.name })];
  if (ctx.paymentMode === 'online') {
    paragraphs.push(t('noShow.online', { amount: formatEmailPrice(ctx.priceCents, locale) }));
  } else if (notice.sanctionApplied) {
    paragraphs.push(t('noShow.onsiteSanction', { count: notice.sanctionsInWindow }));
    if (notice.restrictedUntil) {
      paragraphs.push(
        t('noShow.onsiteRestricted', {
          date: formatEmailShortDate(notice.restrictedUntil, locale),
        }),
      );
    }
  }
  return {
    subject: t('noShow.subject', { provider: ctx.provider.name }),
    heading: t('noShow.heading'),
    greeting: greet(t, ctx.client),
    paragraphs,
    details: bookingBaseDetails(ctx, locale, t),
    outro: [t('noShow.support', { email: SUPPORT_EMAIL })],
    cta: { label: t('noShow.cta'), url: `mailto:${SUPPORT_EMAIL}` },
    ...closing(t),
  };
}

/**
 * El negocio ha corregido el «no presentado». Si había sanción, se dice
 * que está retirada y ya no cuenta para el bloqueo.
 *
 * @param sanctionRevoked — se retiró una sanción (reserva en el local).
 */
export function buildNoShowUndoneEmail(
  ctx: BookingEmailContext,
  sanctionRevoked: boolean,
): EmailContent {
  const { locale } = ctx.client;
  const t = getEmailTranslator(locale);
  const paragraphs = [t('noShowUndone.intro', { provider: ctx.provider.name })];
  if (sanctionRevoked) paragraphs.push(t('noShowUndone.sanctionRevoked'));
  return {
    subject: t('noShowUndone.subject', { provider: ctx.provider.name }),
    heading: t('noShowUndone.heading'),
    greeting: greet(t, ctx.client),
    paragraphs,
    details: bookingBaseDetails(ctx, locale, t),
    outro: [t('noShow.support', { email: SUPPORT_EMAIL })],
    ...closing(t),
  };
}
