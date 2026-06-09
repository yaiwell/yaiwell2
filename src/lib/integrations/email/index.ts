/**
 * API pública de la integración Email (Resend).
 *
 * Todo lo que viva fuera de `lib/integrations/email` debe importar
 * desde este barrel, nunca desde archivos internos. Mantener esta
 * fachada estable nos permite swap por otro proveedor (SES, Postmark)
 * sin tocar los call sites.
 */

export { sendEmail } from './email.service';
export { getEmailClient } from './email.client';
export { EmailConfigError, EmailSendError, EmailValidationError } from './email.errors';
export type { EmailMessage, SendEmailResult } from './email.types';
