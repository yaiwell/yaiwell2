import type { PlanTierId } from '@/lib/services/plans';

import { buildEmailUrl } from './notifications.format';
import { getEmailTranslator } from './notifications.i18n';
import { closing, greet } from './notifications.template-helpers';
import type { EmailContent, ProviderEmailContext } from './notifications.types';

/**
 * Página del panel donde el negocio ve su plan y abre el portal de Stripe
 * (`src/app/[locale]/panel/plan/page.tsx`).
 */
export const PLAN_PANEL_PATH = '/panel/plan';

/**
 * Cobro de la cuota fallido: Stripe reintentará; si no lo consigue el
 * negocio pasará a Gratis. El botón lleva al panel, desde donde se abre
 * el portal para cambiar la tarjeta.
 */
export function buildPlanPaymentFailedEmail(ctx: ProviderEmailContext): EmailContent {
  const { locale } = ctx.owner;
  const t = getEmailTranslator(locale);
  return {
    subject: t('planPaymentFailed.subject', { provider: ctx.name }),
    heading: t('planPaymentFailed.heading'),
    greeting: greet(t, ctx.owner),
    paragraphs: [t('planPaymentFailed.intro', { provider: ctx.name })],
    details: [],
    outro: [t('planPaymentFailed.next', { provider: ctx.name })],
    cta: { label: t('planPaymentFailed.cta'), url: buildEmailUrl(locale, PLAN_PANEL_PATH) },
    ...closing(t),
  };
}

/**
 * El negocio ha pasado a Gratis (impago tras los reintentos o
 * cancelación) y los servicios que sobren quedan ocultos.
 *
 * @param fromPlan — plan de pago que tenía.
 */
export function buildPlanDowngradedEmail(
  ctx: ProviderEmailContext,
  fromPlan: PlanTierId,
): EmailContent {
  const { locale } = ctx.owner;
  const t = getEmailTranslator(locale);
  return {
    subject: t('planDowngraded.subject', { provider: ctx.name }),
    heading: t('planDowngraded.heading'),
    greeting: greet(t, ctx.owner),
    paragraphs: [
      t('planDowngraded.intro', { provider: ctx.name, plan: t(`planNames.${fromPlan}`) }),
    ],
    details: [],
    outro: [t('planDowngraded.next')],
    cta: { label: t('planDowngraded.cta'), url: buildEmailUrl(locale, PLAN_PANEL_PATH) },
    ...closing(t),
  };
}
