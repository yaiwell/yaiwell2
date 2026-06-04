/**
 * Tipos específicos del componente SignInForm.
 *
 * Los tipos compartidos del dominio de auth (códigos de error, roles)
 * viven en `@/lib/auth` para que SignIn, SignUp y los guards consuman
 * el mismo contrato y no se desincronicen.
 */

import type { AuthErrorCode } from '@/lib/auth';

/**
 * Rol seleccionado en las pestañas del formulario.
 *
 * Importante: la pestaña es solo una pista de UX. El destino real
 * post-login se calcula con el rol que tenga el usuario en Clerk
 * (publicMetadata.role o, durante el gap pre-webhook, unsafeMetadata.role).
 * Si alguien con cuenta de proveedor selecciona "cliente", igual aterriza
 * en `/panel` porque su rol persistido manda sobre la pestaña.
 */
export type SignInRole = 'client' | 'provider';

/** Datos crudos que captura el formulario antes de validar. */
export interface SignInDraft {
  email: string;
  password: string;
  remember: boolean;
}

/** Estado de envío del formulario. */
export type SignInStatus = 'idle' | 'submitting' | 'error';

/**
 * Subconjunto de `AuthErrorCode` que puede surgir durante sign-in.
 *
 * Lo aliasamos para que el componente UI no tenga que mapear códigos
 * irrelevantes (los de sign-up, etc.) y para que el `Record` de
 * traducciones sea exhaustivo solo en estos.
 */
export type SignInErrorCode = Extract<
  AuthErrorCode,
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'invalidCredentials'
  | 'tooManyAttempts'
  | 'sessionExists'
  | 'networkError'
  | 'unknown'
>;
