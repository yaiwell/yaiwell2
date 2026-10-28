import type { EmailTranslator } from './notifications.i18n';
import type { EmailContent, EmailRecipient } from './notifications.types';

/** Saludo con nombre si lo tenemos; sin él, genérico. */
export function greet(t: EmailTranslator, recipient: EmailRecipient): string {
  return recipient.fullName
    ? t('common.greeting', { name: recipient.fullName })
    : t('common.greetingNoName');
}

/** Cierre común a todos los correos. */
export function closing(t: EmailTranslator): Pick<EmailContent, 'signature' | 'footer'> {
  return { signature: t('common.signature'), footer: t('common.footer') };
}
