/**
 * Tipos específicos del componente ResetPasswordForm.
 *
 * Los tipos compartidos del dominio de auth (códigos de error, roles)
 * viven en `@/lib/auth`. Aquí solo aliasamos el subconjunto que el
 * flujo de recuperación necesita exhibir y los tipos locales del draft.
 */

import type { AuthErrorCode } from '@/lib/auth';

/**
 * Fase del flujo de recuperación.
 *
 * - `request`: el usuario teclea el email al que enviar el código.
 * - `reset`: el usuario introduce el código recibido y la nueva
 *   contraseña.
 */
export type ResetPasswordPhase = 'request' | 'reset';

/** Identificadores estables de los inputs para anclar errores ARIA. */
export const RESET_PASSWORD_FIELD_IDS = {
  email: 'reset-password-email',
  code: 'reset-password-code',
  newPassword: 'reset-password-new',
  newPasswordRepeat: 'reset-password-new-repeat',
} as const;

/** Datos crudos que captura el formulario antes de validar. */
export interface ResetPasswordDraft {
  email: string;
  code: string;
  newPassword: string;
  newPasswordRepeat: string;
}

/**
 * Subconjunto de `AuthErrorCode` que aplica al flujo de recuperación.
 *
 * Lo aliasamos para que el componente UI sólo deba mapear códigos
 * relevantes y para que el `Record` de traducciones sea exhaustivo.
 * - `invalidCredentials`: usado como bucket para "email no encontrado"
 *   (no revelamos si el email existe — política igual que sign-in).
 */
export type ResetPasswordErrorCode = Extract<
  AuthErrorCode,
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordTooShort'
  | 'passwordMismatch'
  | 'passwordCompromised'
  | 'invalidCredentials'
  | 'verificationCodeInvalid'
  | 'verificationCodeExpired'
  | 'tooManyAttempts'
  | 'sessionExists'
  | 'networkError'
  | 'unknown'
>;

/** Mapa de errores por campo para anclarlos al input correspondiente. */
export type ResetPasswordFieldErrors = Partial<
  Record<keyof ResetPasswordDraft, ResetPasswordErrorCode>
>;

/** Error global que no pertenece a un campo concreto (banner superior). */
export type ResetPasswordRootError = ResetPasswordErrorCode | null;
