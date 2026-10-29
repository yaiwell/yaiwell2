import { pickLocalized } from '@/lib/i18n';
// Import directo: el barrel de review arrastra Prisma.
import { REVIEW_WINDOW_DAYS } from '@/lib/services/review/review.window';
import { isLastMinuteAtCreation } from '@/lib/utils/booking-last-minute';
import { buildProviderSlugWithId } from '@/lib/utils/provider-slug';

import { bookingBaseDetails, bookingDetails } from './notifications.booking-details';
import { buildEmailUrl, formatEmailDateTime, formatEmailPrice } from './notifications.format';
import { getEmailTranslator } from './notifications.i18n';
import { closing, greet } from './notifications.template-helpers';
import type {
  BookingEmailContext,
  CancellationRefundState,
  EmailContent,
} from './notifications.types';

/**
 * Recibo al cliente cuando el pago confirma la reserva. Si era de última
 * hora lo recuerda: ese pago no admite devolución (§4.bis).
 */
export function buildBookingConfirmedEmail(ctx: BookingEmailContext): EmailContent {
  const { locale } = ctx.client;
  const t = getEmailTranslator(locale);
  const paragraphs = [t('bookingConfirmed.intro', { provider: ctx.provider.name })];
  if (isLastMinuteAtCreation(ctx.startAt, ctx.createdAt)) {
    paragraphs.push(t('bookingConfirmed.lastMinute'));
  }
  return {
    subject: t('bookingConfirmed.subject', { provider: ctx.provider.name }),
    heading: t('bookingConfirmed.heading'),
    greeting: greet(t, ctx.client),
    paragraphs,
    details: bookingDetails(ctx, locale, t),
    cta: { label: t('bookingConfirmed.cta'), url: buildEmailUrl(locale, '/mis-reservas') },
    ...closing(t),
  };
}

/**
 * Aviso al dueño del negocio de una reserva pagada. Lleva el nombre del
 * cliente y sus notas, nunca su email: el contacto pasa por Yaiwell.
 */
export function buildProviderNewBookingEmail(ctx: BookingEmailContext): EmailContent {
  const { locale } = ctx.owner;
  const t = getEmailTranslator(locale);
  const service = pickLocalized(ctx.serviceName, locale);
  const clientName = ctx.client.fullName ?? t('common.clientLabel');
  const details = bookingDetails(ctx, locale, t);
  // El cliente va justo tras el servicio: es lo primero que busca el centro.
  details.splice(1, 0, { label: t('common.clientLabel'), value: clientName });
  if (ctx.notes) details.push({ label: t('common.notesLabel'), value: ctx.notes });
  return {
    subject: t('providerNewBooking.subject', {
      service,
      when: formatEmailDateTime(ctx.startAt, locale),
    }),
    heading: t('providerNewBooking.heading'),
    greeting: greet(t, ctx.owner),
    paragraphs: [t('providerNewBooking.intro', { client: clientName })],
    details,
    cta: {
      label: t('providerNewBooking.cta'),
      url: buildEmailUrl(locale, '/panel/calendario'),
    },
    ...closing(t),
  };
}

/**
 * Aviso al cliente cuando el centro cancela. Si el reembolso no salió
 * a la primera, no prometemos plazos: lo resuelve soporte.
 */
export function buildBookingCancelledEmail(
  ctx: BookingEmailContext,
  refund: CancellationRefundState,
): EmailContent {
  const { locale } = ctx.client;
  const t = getEmailTranslator(locale);
  const amount = formatEmailPrice(ctx.priceCents, locale);
  const paragraphs = [t('bookingCancelled.intro', { provider: ctx.provider.name })];
  if (refund === 'refunded') paragraphs.push(t('bookingCancelled.refundIssued', { amount }));
  if (refund === 'refund_pending') paragraphs.push(t('bookingCancelled.refundPending', { amount }));
  if (refund === 'refund_uncertain') {
    paragraphs.push(t('bookingCancelled.refundUncertain', { amount }));
  }
  return {
    subject: t('bookingCancelled.subject', { provider: ctx.provider.name }),
    heading: t('bookingCancelled.heading'),
    greeting: greet(t, ctx.client),
    paragraphs,
    details: bookingBaseDetails(ctx, locale, t),
    cta: {
      label: t('bookingCancelled.cta'),
      url: buildEmailUrl(locale, `/centro/${buildProviderSlugWithId(ctx.provider)}`),
    },
    ...closing(t),
  };
}

/** Invitación a valorar tras marcar la cita como finalizada (§4.bis). */
export function buildReviewInviteEmail(ctx: BookingEmailContext): EmailContent {
  const { locale } = ctx.client;
  const t = getEmailTranslator(locale);
  const service = pickLocalized(ctx.serviceName, locale);
  return {
    subject: t('reviewInvite.subject', { provider: ctx.provider.name }),
    heading: t('reviewInvite.heading'),
    greeting: greet(t, ctx.client),
    paragraphs: [
      t('reviewInvite.intro', { provider: ctx.provider.name, service }),
      t('reviewInvite.window', { days: REVIEW_WINDOW_DAYS }),
    ],
    details: [],
    cta: { label: t('reviewInvite.cta'), url: buildEmailUrl(locale, '/mis-reservas') },
    ...closing(t),
  };
}

/**
 * Pago que llegó cuando la franja ya no estaba disponible: la reserva
 * no se confirma y el dinero vuelve solo. Sin este aviso el cliente
 * habría pagado y no tendría cita ni explicación.
 *
 * @param refund — `refunded` si Stripe aceptó el reembolso; si no, en trámite.
 */
export function buildLatePaymentRefundedEmail(
  ctx: BookingEmailContext,
  refund: Extract<CancellationRefundState, 'refunded' | 'refund_pending'>,
): EmailContent {
  const { locale } = ctx.client;
  const t = getEmailTranslator(locale);
  const amount = formatEmailPrice(ctx.priceCents, locale);
  return {
    subject: t('latePaymentRefunded.subject', { provider: ctx.provider.name }),
    heading: t('latePaymentRefunded.heading'),
    greeting: greet(t, ctx.client),
    paragraphs: [
      t('latePaymentRefunded.intro', { provider: ctx.provider.name }),
      refund === 'refunded'
        ? t('bookingCancelled.refundIssued', { amount })
        : t('bookingCancelled.refundPending', { amount }),
    ],
    details: bookingBaseDetails(ctx, locale, t),
    cta: {
      label: t('latePaymentRefunded.cta'),
      url: buildEmailUrl(locale, `/centro/${buildProviderSlugWithId(ctx.provider)}`),
    },
    ...closing(t),
  };
}
