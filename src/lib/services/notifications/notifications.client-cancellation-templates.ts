import { pickLocalized } from '@/lib/i18n';
import { getMadridWeekStartKey } from '@/lib/utils/madrid-week';
import { buildProviderSlugWithId } from '@/lib/utils/provider-slug';

import { bookingBaseDetails } from './notifications.booking-details';
import { buildEmailUrl, formatEmailDateTime, formatEmailPrice } from './notifications.format';
import { getEmailTranslator } from './notifications.i18n';
import { closing, greet } from './notifications.template-helpers';
import type {
  BookingEmailContext,
  CancellationRefundState,
  EmailContent,
} from './notifications.types';

/**
 * Plantillas de la cancelación hecha por el propio cliente (§4.bis,
 * decidido 2026-10-29): confirmación al cliente con el estado de su
 * dinero y aviso al centro de que la franja queda libre.
 */

/**
 * Confirmación al cliente de que su reserva está cancelada. Los textos
 * del reembolso son los mismos que cuando cancela el centro: el dinero
 * sigue exactamente el mismo camino.
 *
 * @param refund — qué contar del dinero (ver `CancellationRefundState`).
 */
export function buildClientCancellationEmail(
  ctx: BookingEmailContext,
  refund: CancellationRefundState,
): EmailContent {
  const { locale } = ctx.client;
  const t = getEmailTranslator(locale);
  const amount = formatEmailPrice(ctx.priceCents, locale);
  const paragraphs = [t('clientCancelled.intro', { provider: ctx.provider.name })];
  if (refund === 'refunded') paragraphs.push(t('bookingCancelled.refundIssued', { amount }));
  if (refund === 'refund_pending') paragraphs.push(t('bookingCancelled.refundPending', { amount }));
  if (refund === 'refund_uncertain') {
    paragraphs.push(t('bookingCancelled.refundUncertain', { amount }));
  }
  if (refund === 'no_payment') paragraphs.push(t('clientCancelled.noPayment'));
  return {
    subject: t('clientCancelled.subject', { provider: ctx.provider.name }),
    heading: t('clientCancelled.heading'),
    greeting: greet(t, ctx.client),
    paragraphs,
    details: bookingBaseDetails(ctx, locale, t),
    cta: {
      label: t('clientCancelled.cta'),
      url: buildEmailUrl(locale, `/centro/${buildProviderSlugWithId(ctx.provider)}`),
    },
    ...closing(t),
  };
}

/**
 * Enlace al calendario del panel en la semana de la reserva. Con
 * `release`, el panel abre directamente el diálogo de liberar esa hora
 * con descuento (`?liberar=<bookingId>`), el mismo que se ofrece tras
 * cancelar el propio centro.
 */
export function buildPanelCalendarPath(
  ctx: Pick<BookingEmailContext, 'bookingId' | 'startAt'>,
  release: boolean,
): string {
  const params = new URLSearchParams({ semana: getMadridWeekStartKey(ctx.startAt) });
  if (release) params.set('liberar', ctx.bookingId);
  return `/panel/calendario?${params.toString()}`;
}

/**
 * Aviso al dueño del negocio de que un cliente ha cancelado. Como en el
 * aviso de reserva nueva, lleva el nombre del cliente y nunca su email.
 *
 * Igual que tras cancelar él (§4.bis, huecos liberados, caso a), se le
 * ofrece liberar la hora con descuento. Si la reserva ya se había
 * vendido con una oferta, esa oferta sigue activa y la hora vuelve a
 * anunciarse sola: se le cuenta y el botón solo abre el calendario.
 *
 * @param offerReopened — la reserva venía de una oferta que sigue activa.
 */
export function buildProviderClientCancelledEmail(
  ctx: BookingEmailContext,
  offerReopened: boolean,
): EmailContent {
  const { locale } = ctx.owner;
  const t = getEmailTranslator(locale);
  const service = pickLocalized(ctx.serviceName, locale);
  const clientName = ctx.client.fullName ?? t('common.clientLabel');
  const details = bookingBaseDetails(ctx, locale, t);
  // El cliente va justo tras el servicio: es lo primero que busca el centro.
  details.splice(1, 0, { label: t('common.clientLabel'), value: clientName });
  if (ctx.professionalName) {
    details.push({ label: t('common.professionalLabel'), value: ctx.professionalName });
  }
  return {
    subject: t('providerClientCancelled.subject', {
      service,
      when: formatEmailDateTime(ctx.startAt, locale),
    }),
    heading: t('providerClientCancelled.heading'),
    greeting: greet(t, ctx.owner),
    paragraphs: [
      t('providerClientCancelled.intro', { client: clientName }),
      t('providerClientCancelled.slotFree'),
      offerReopened
        ? t('providerClientCancelled.offerReopened')
        : t('providerClientCancelled.releaseHint'),
    ],
    details,
    cta: {
      label: offerReopened
        ? t('providerClientCancelled.calendarCta')
        : t('providerClientCancelled.releaseCta'),
      url: buildEmailUrl(locale, buildPanelCalendarPath(ctx, !offerReopened)),
    },
    ...closing(t),
  };
}
