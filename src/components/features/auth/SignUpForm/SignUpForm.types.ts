/**
 * Tipos específicos del componente SignUpForm.
 *
 * Los códigos de error y el rol viven en `@/lib/auth` para que sign-in,
 * sign-up, guards y webhook consuman el mismo contrato.
 */

import type { AuthErrorCode } from '@/lib/auth';

/**
 * Pestaña activa del formulario.
 *
 * - `client`: alta de un usuario final que reserva servicios.
 * - `provider`: alta de un autónomo o centro que ofrecerá servicios y
 *   pasará por verificación manual antes de salir publicado.
 */
export type SignUpRole = 'client' | 'provider';

/**
 * Fases del wizard de registro.
 *
 * - `form`: el usuario rellena email + contraseña + datos personales.
 *   Al enviar disparamos `signUp.create` y `prepareEmailAddressVerification`.
 * - `verification`: el usuario introduce el código OTP de 6 dígitos
 *   recibido por email; al validar, completamos la sesión y redirigimos.
 */
export type SignUpPhase = 'form' | 'verification';

/**
 * Estado del formulario en la fase 1.
 *
 * Mantenemos un único draft para ambas pestañas y solo validamos los
 * campos relevantes a la activa. Permite cambiar de pestaña sin perder
 * lo tecleado.
 */
export interface SignUpDraft {
  fullName: string;
  businessName: string;
  email: string;
  password: string;
  passwordRepeat: string;
  acceptsTerms: boolean;
}

/**
 * Mapa de errores por campo, tipado con `AuthErrorCode`.
 *
 * El componente UI traduce el código a string con `Record<AuthErrorCode,
 * string>` construido con `t()` — patrón "next-intl no acepta claves
 * dinámicas".
 */
export type SignUpFieldErrors = Partial<Record<keyof SignUpDraft, AuthErrorCode>>;

/**
 * Error global no anclado a un campo concreto (rate limit, red, fallo
 * Clerk genérico). Se pinta como banner sobre el formulario.
 */
export type SignUpRootError = AuthErrorCode | null;

/**
 * Identificadores de campos para asociar labels con inputs y mensajes
 * de error.
 */
export const SIGN_UP_FIELD_IDS = {
  fullName: 'signup-full-name',
  businessName: 'signup-business-name',
  email: 'signup-email',
  password: 'signup-password',
  passwordRepeat: 'signup-password-repeat',
  acceptsTerms: 'signup-accepts-terms',
  verificationCode: 'signup-verification-code',
} as const;
