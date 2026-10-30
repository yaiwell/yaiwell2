/**
 * Aviso por email del impago de comisiones del pago en el local. Como el
 * resto de avisos, **nunca lanza**: se programa tras responder al webhook
 * de Stripe y un correo perdido no puede provocar un reintento del evento.
 */
import 'server-only';

import { PLAN_PANEL_PATH } from './notifications.billing-templates';
import { deliverEmail } from './notifications.delivery';
import { buildEmailUrl } from './notifications.format';
import { getEmailTranslator } from './notifications.i18n';
import { withProvider } from './notifications.service';
import { closing, greet } from './notifications.template-helpers';
import type { EmailContent, ProviderEmailContext } from './notifications.types';

/**
 * Cobro de la factura de comisiones fallido: el pago en el local queda
 * suspendido para reservas nuevas hasta que se cobre (§4.bis). El botón
 * lleva a `/panel/plan`, donde está la tarjeta «Cobro en el local» para
 * cambiar el método de pago.
 */
export function buildCommissionPaymentFailedEmail(ctx: ProviderEmailContext): EmailContent {
  const { locale } = ctx.owner;
  const t = getEmailTranslator(locale);
  return {
    subject: t('commissionPaymentFailed.subject', { provider: ctx.name }),
    heading: t('commissionPaymentFailed.heading'),
    greeting: greet(t, ctx.owner),
    paragraphs: [t('commissionPaymentFailed.intro', { provider: ctx.name })],
    details: [],
    outro: [t('commissionPaymentFailed.next')],
    cta: {
      label: t('commissionPaymentFailed.cta'),
      url: buildEmailUrl(locale, PLAN_PANEL_PATH),
    },
    ...closing(t),
  };
}

/**
 * Avisa al dueño de que no se ha podido cobrar su factura de comisiones.
 *
 * @param key — `${invoiceId}:${intento}`: cada intento fallido nuevo que
 *   cambie el estado avisa una vez; una reentrega del webhook, no.
 */
export async function notifyCommissionPaymentFailed(
  providerId: string,
  key: string,
): Promise<void> {
  await withProvider('commission-payment-failed', providerId, (ctx) =>
    deliverEmail(
      'commission-payment-failed',
      key,
      ctx.owner,
      buildCommissionPaymentFailedEmail(ctx),
    ),
  );
}
