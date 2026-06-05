/**
 * Tipos compartidos del dominio de autenticación.
 *
 * Centralizamos aquí los códigos de error y los roles para que los
 * formularios (SignInForm, SignUpForm), los guards (layouts privados) y
 * el webhook (capa 2) consuman el mismo contrato y no se desincronicen.
 *
 * El union `AuthErrorCode` se traduce en los componentes via next-intl
 * con un `Record<AuthErrorCode, string>` explícito — next-intl no
 * acepta claves dinámicas, así que el mapping es exhaustivo a propósito.
 */

/**
 * Roles que la app reconoce.
 *
 * - `client`: usuario final que reserva servicios. Aterriza en `/`.
 * - `provider`: autónomo o centro que ofrece servicios. Aterriza en
 *   `/panel`. Requiere verificación manual antes de que su catálogo
 *   sea público (cola en `/admin`).
 * - `admin`: equipo interno de moderación. Aterriza en `/admin`. Solo
 *   se asigna manualmente desde el dashboard de Clerk — la UI pública
 *   no lo expone como opción en sign-up.
 *
 * Espejo del enum `UserRole` de Prisma (capa 2 lo replica en BD).
 */
export type UserRole = 'client' | 'provider' | 'admin';

/**
 * Códigos de error tipados que cubren validación local + errores que
 * devuelve la API de Clerk durante sign-in / sign-up / verificación.
 *
 * Mantenerlo como union cerrado permite que el mapping a copy traducido
 * sea exhaustivo (TypeScript marca el `Record` incompleto).
 */
export type AuthErrorCode =
  // Validación cliente: compartida con los formularios.
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordTooShort'
  | 'passwordMismatch'
  | 'fullNameRequired'
  | 'businessNameRequired'
  | 'termsRequired'
  // Errores Clerk en sign-in.
  | 'invalidCredentials'
  | 'tooManyAttempts'
  | 'sessionExists'
  // Errores Clerk en sign-up.
  | 'emailAlreadyExists'
  | 'passwordCompromised'
  | 'verificationCodeInvalid'
  | 'verificationCodeExpired'
  // Genéricos / fallback.
  | 'networkError'
  | 'unknown';
