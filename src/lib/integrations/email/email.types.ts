/**
 * Tipos del dominio email.
 *
 * `EmailMessage` modela el sobre + cuerpo del mail transaccional.
 * Mantenemos el tipo agnóstico al proveedor (Resend hoy, sustituible
 * por SES/Postmark mañana) para que las funciones de Fase 1
 * (`sendBookingConfirmation`, `sendBookingReminder`, etc.) compilen
 * contra nuestro tipo y no contra el del SDK.
 */

export interface EmailMessage {
  /**
   * Remitente. Si no se pasa, el wrapper usa el `EMAIL_FROM_DEFAULT`
   * (Yaiwell <noreply@yaiwell.com>) o el sandbox de Resend cuando el
   * dominio aún no está verificado.
   */
  from?: string;
  /** Lista de destinatarios. Mínimo uno. */
  to: string[];
  /** Asunto del email. Va sin sufijo `[Yaiwell]` — eso lo añade la plantilla si lo necesita. */
  subject: string;
  /** Cuerpo HTML del email. Al menos uno de `html` o `text` debe estar presente. */
  html?: string;
  /** Cuerpo en texto plano (fallback para clientes que no renderizan HTML). */
  text?: string;
  /**
   * Lista opcional de Reply-To. Útil para mails de proveedor (poner el
   * email del centro) o para reservas (poner soporte).
   */
  replyTo?: string[];
  /**
   * Headers extra. Mantenemos abierto el bypass por si algún caso
   * concreto necesita `X-Entity-Ref-ID` u otros, pero el wrapper no
   * inyecta nada por defecto.
   */
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  /** ID que Resend devuelve para tracking + delivery webhooks futuros. */
  providerId: string;
}
