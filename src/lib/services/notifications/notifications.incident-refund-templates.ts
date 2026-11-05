import { pickLocalized } from '@/lib/i18n';
import { buildProviderSlugWithId } from '@/lib/utils/provider-slug';

import { bookingBaseDetails } from './notifications.booking-details';
import { buildPanelCalendarPath } from './notifications.client-cancellation-templates';
import { buildEmailUrl, formatEmailDateTime, formatEmailPrice } from './notifications.format';
import { getEmailTranslator } from './notifications.i18n';
import { closing, greet } from './notifications.template-helpers';
import type {
  BookingEmailContext,
  CancellationRefundState,
  EmailContent,
  IncidentSlotNotice,
} from './notifications.types';

/**
 * Plantillas del reembolso por incidencia del centro que gestiona soporte.
 * El motivo que escribe soporte no aparece: es una nota interna.
 */

/**
 * Aviso al cliente de una cita ya finalizada o pasada que se le devuelve. El
 * de «ha cancelado tu reserva» no le encaja: la hora ya no estaba por venir.
 * Los textos del dinero son los de siempre, para no prometer más que en otros
 * caminos.
 *
 * @param refund — qué contar del dinero.
 */
export function buildPastIncidentRefundEmail(
  ctx: BookingEmailContext,
  refund: CancellationRefundState,
): EmailContent {
  const { locale } = ctx.client;
  const t = getEmailTranslator(locale);
  const amount = formatEmailPrice(ctx.priceCents, locale);
  return {
    subject: t('incidentRefund.clientSubject', { provider: ctx.provider.name }),
    heading: t('incidentRefund.clientHeading', { provider: ctx.provider.name }),
    greeting: greet(t, ctx.client),
    paragraphs: [
      t('incidentRefund.clientIntro', { provider: ctx.provider.name }),
      refund === 'refund_pending'
        ? t('bookingCancelled.refundPending', { amount })
        : t('bookingCancelled.refundIssued', { amount }),
    ],
    details: bookingBaseDetails(ctx, locale, t),
    cta: {
      label: t('incidentRefund.clientCta'),
      url: buildEmailUrl(locale, `/centro/${buildProviderSlugWithId(ctx.provider)}`),
    },
    ...closing(t),
  };
}

/**
 * Aviso al dueño del negocio: es su saldo el que baja, en su parte neta (la
 * comisión ya no llegó a recibirla). Como los demás avisos al centro, lleva el
 * nombre del cliente y nunca su email. A propósito no ofrece liberar la hora
 * con descuento: el centro no puede atender.
 *
 * @param refund — si el reembolso falló, se cuenta como «en trámite».
 * @param slot — qué ha pasado con la franja.
 */
export function buildProviderIncidentRefundEmail(
  ctx: BookingEmailContext,
  refund: CancellationRefundState,
  slot: IncidentSlotNotice,
): EmailContent {
  const { locale } = ctx.owner;
  const t = getEmailTranslator(locale);
  const service = pickLocalized(ctx.serviceName, locale);
  const clientName = ctx.client.fullName ?? t('common.clientLabel');
  const amount = formatEmailPrice(ctx.priceCents, locale);
  const net = formatEmailPrice(ctx.priceCents - ctx.commissionCents, locale);
  const pending = refund === 'refund_pending';
  const subjectArgs = { service, when: formatEmailDateTime(ctx.startAt, locale) };
  const details = bookingBaseDetails(ctx, locale, t);
  // El cliente va justo tras el servicio: es lo primero que busca el centro.
  details.splice(1, 0, { label: t('common.clientLabel'), value: clientName });
  return {
    subject: pending
      ? t('incidentRefund.providerSubjectPending', subjectArgs)
      : t('incidentRefund.providerSubject', subjectArgs),
    heading: pending
      ? t('incidentRefund.providerHeadingPending')
      : t('incidentRefund.providerHeading'),
    greeting: greet(t, ctx.owner),
    paragraphs: [
      pending
        ? t('incidentRefund.providerIntroPending', { client: clientName, amount })
        : t('incidentRefund.providerIntro', { client: clientName, amount }),
      pending
        ? t('incidentRefund.providerBalancePending', { net })
        : t('incidentRefund.providerBalance', { net }),
      ...(slot === 'blocked' ? [t('incidentRefund.providerSlotBlocked')] : []),
      ...(slot === 'not_blocked' ? [t('incidentRefund.providerSlotFree')] : []),
      ...(slot === 'taken' ? [t('incidentRefund.providerSlotTaken')] : []),
    ],
    details,
    cta: {
      label: t('incidentRefund.providerCta'),
      url: buildEmailUrl(locale, buildPanelCalendarPath(ctx, false)),
    },
    ...closing(t),
  };
}
