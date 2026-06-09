import type { CreateEmailOptions } from 'resend';

import { getEmailClient } from './email.client';
import { EmailSendError, EmailValidationError } from './email.errors';
import type { EmailMessage, SendEmailResult } from './email.types';

/**
 * Remitente por defecto. Mientras `yaiwell.com` no esté verificado en
 * Resend, sobrescribir con `EMAIL_FROM_DEFAULT` apuntando al sandbox
 * (`onboarding@resend.dev`) — Resend solo deja enviar al email con el
 * que se registró la cuenta, suficiente para validar el wrapper en local.
 */
const FALLBACK_FROM = 'Yaiwell <noreply@yaiwell.com>';

/**
 * Envía un email transaccional vía Resend.
 *
 * Wrapper de alto nivel sobre `getEmailClient().emails.send()` que:
 *  - Aplica el remitente por defecto si no se pasa `from`.
 *  - Valida que haya al menos un destinatario y un cuerpo (`html` o `text`).
 *  - Traduce errores del SDK a `EmailSendError` tipado, **sin propagar
 *    el cuerpo del email** (los logs no deben contener PII de clientes).
 *
 * En Fase 1 esto será el primitive sobre el que se construirán los
 * helpers por caso de uso (`sendBookingConfirmation`,
 * `sendVerificationApproved`, etc.) con su plantilla y traducciones.
 *
 * @param message — sobre + cuerpo del email.
 * @returns ID que Resend asigna para tracking / delivery webhooks.
 * @throws EmailValidationError si faltan destinatarios o cuerpo.
 * @throws EmailConfigError si falta `RESEND_API_KEY`.
 * @throws EmailSendError si Resend rechaza el envío.
 */
export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  if (message.to.length === 0) {
    throw new EmailValidationError('El email necesita al menos un destinatario.');
  }
  if (!message.html && !message.text) {
    throw new EmailValidationError('El email necesita cuerpo HTML o texto plano.');
  }

  const from = message.from ?? process.env.EMAIL_FROM_DEFAULT ?? FALLBACK_FROM;
  const client = getEmailClient();

  // El SDK de Resend tiene una unión discriminada por cuerpo (`html` |
  // `text` | `react` | `template`): TS no narrowea con propiedades
  // opcionales sueltas. Construimos el payload con `html`/`text` ya
  // narrowed a string (la validación de arriba garantiza que al menos
  // uno existe) y casteamos a `CreateEmailOptions` para señalar a TS
  // qué variante del union estamos usando.
  const payload: CreateEmailOptions = {
    from,
    to: message.to,
    subject: message.subject,
    html: message.html ?? undefined,
    text: message.text ?? undefined,
    replyTo: message.replyTo,
    headers: message.headers,
  } as CreateEmailOptions;

  const { data, error } = await client.emails.send(payload);

  if (error) {
    // No propagamos el `message` (que puede incluir fragmentos del
    // payload) a los logs estructurados aguas arriba. El `name`/`message`
    // del SDK son seguros (validaciones de formato, dominio no
    // verificado, rate limit, etc.).
    throw new EmailSendError(error.message ?? 'unknown_provider_error');
  }

  if (!data?.id) {
    // Defensa adicional: si Resend devuelve OK pero sin id, lo tratamos
    // como fallo — no tenemos forma de hacer follow-up sobre el envío.
    throw new EmailSendError('Resend devolvió OK sin id.');
  }

  return { providerId: data.id };
}
