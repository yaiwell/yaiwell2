import type { AuthErrorCode } from './types';

/**
 * Forma del payload de error que devuelve el SDK de Clerk en cliente.
 *
 * No importamos los tipos de `@clerk/types` porque queremos que esta
 * función sea pura y testable sin dependencias del SDK. Definimos lo
 * mínimo que leemos.
 */
interface ClerkAPIErrorShape {
  code?: string;
  message?: string;
  longMessage?: string;
  meta?: Record<string, unknown>;
}

interface ClerkErrorEnvelope {
  errors?: ClerkAPIErrorShape[];
  clerkError?: boolean;
}

/**
 * Mapea un error de Clerk (o cualquier otra cosa) a un `AuthErrorCode`
 * de nuestra unión interna.
 *
 * Estrategia:
 *  1. Si la forma coincide con `{ errors: ClerkAPIError[] }`, leemos el
 *     primer `code` y aplicamos el switch.
 *  2. Si es un `Error` genérico con mensaje relacionado a red, mapeamos
 *     a `networkError`.
 *  3. Cualquier otra cosa → `unknown`.
 *
 * El switch es exhaustivo a propósito para que añadir un caso nuevo en
 * Clerk obligue a actualizar el mapping.
 *
 * Códigos cubiertos (lista oficial de Clerk):
 *  - `form_password_incorrect`        → invalidCredentials
 *  - `form_identifier_not_found`      → invalidCredentials (bucketing
 *    intencionado: no revelamos si el email existe)
 *  - `form_identifier_exists`         → emailAlreadyExists
 *  - `form_password_pwned`            → passwordCompromised
 *  - `form_password_length_too_short` → passwordTooShort
 *  - `form_code_incorrect`            → verificationCodeInvalid
 *  - `verification_expired`           → verificationCodeExpired
 *  - `too_many_requests`              → tooManyAttempts
 *  - `session_exists`                 → sessionExists
 */
export function mapClerkError(err: unknown): AuthErrorCode {
  // Forma estándar del SDK de Clerk en cliente: `{ errors: [...] }`.
  if (typeof err === 'object' && err !== null && 'errors' in err) {
    const envelope = err as ClerkErrorEnvelope;
    const first = envelope.errors?.[0];
    const code = first?.code;
    if (typeof code === 'string') {
      const mapped = mapClerkCodeString(code);
      if (mapped !== null) return mapped;
    }
  }

  // Error genérico de red: en navegador llega como `TypeError: Failed
  // to fetch` o similar. Heurística por mensaje, suficiente para el
  // copy al usuario.
  if (err instanceof Error && /network|fetch|offline/i.test(err.message)) {
    return 'networkError';
  }

  return 'unknown';
}

/**
 * Switch puro para los códigos de Clerk relevantes.
 * Lo exportamos sólo para poder testearlo sin construir el envoltorio.
 */
function mapClerkCodeString(code: string): AuthErrorCode | null {
  switch (code) {
    case 'form_password_incorrect':
    case 'form_identifier_not_found':
      return 'invalidCredentials';
    case 'form_identifier_exists':
      return 'emailAlreadyExists';
    case 'form_password_pwned':
      return 'passwordCompromised';
    case 'form_password_length_too_short':
      return 'passwordTooShort';
    case 'form_code_incorrect':
      return 'verificationCodeInvalid';
    case 'verification_expired':
    case 'verification_failed':
      return 'verificationCodeExpired';
    case 'too_many_requests':
    case 'rate_limit_exceeded':
      return 'tooManyAttempts';
    case 'session_exists':
      return 'sessionExists';
    default:
      return null;
  }
}
