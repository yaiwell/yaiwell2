import { buildEmailUrl } from './notifications.format';
import { getEmailTranslator } from './notifications.i18n';
import { closing, greet } from './notifications.template-helpers';
import type { EmailContent, ProviderEmailContext } from './notifications.types';

/** Aviso al dueño de que su negocio ya está publicado. */
export function buildProviderApprovedEmail(ctx: ProviderEmailContext): EmailContent {
  const { locale } = ctx.owner;
  const t = getEmailTranslator(locale);
  return {
    subject: t('providerApproved.subject', { provider: ctx.name }),
    heading: t('providerApproved.heading'),
    greeting: greet(t, ctx.owner),
    paragraphs: [t('providerApproved.intro', { provider: ctx.name })],
    details: [],
    cta: { label: t('providerApproved.cta'), url: buildEmailUrl(locale, '/panel') },
    ...closing(t),
  };
}

/**
 * Aviso de rechazo con el motivo que escribió el equipo de verificación.
 * El motivo va tal cual (escapado al pintar): es la parte útil del correo.
 */
export function buildProviderRejectedEmail(ctx: ProviderEmailContext, notes: string): EmailContent {
  const { locale } = ctx.owner;
  const t = getEmailTranslator(locale);
  return {
    subject: t('providerRejected.subject', { provider: ctx.name }),
    heading: t('providerRejected.heading'),
    greeting: greet(t, ctx.owner),
    paragraphs: [t('providerRejected.intro', { provider: ctx.name })],
    quote: notes,
    details: [],
    outro: [t('providerRejected.next')],
    cta: { label: t('providerRejected.cta'), url: buildEmailUrl(locale, '/panel') },
    ...closing(t),
  };
}
