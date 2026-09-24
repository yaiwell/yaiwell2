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
 * Tier de plan preseleccionado desde `/profesionales?plan=…`.
 *
 * Duplicamos el union en lugar de importarlo de `@/lib/services/plans`
 * porque ese barrel arrastra Prisma y este archivo lo consume un
 * Client Component. La sincronización está garantizada por tipos: el
 * page de `/registro` pasa un `PlanTierId` a esta prop, así que si los
 * dos unions divergen, `npm run typecheck` falla.
 */
export type SignUpPlanTier = 'free' | 'basic' | 'pro' | 'premium';

/**
 * Props del formulario de alta.
 *
 * Ambas nacen de los searchParams con los que la landing de
 * proveedores empuja al alta, ya validados con Zod en la page.
 */
export interface SignUpFormProps {
  /** Pestaña activa al montar. Por defecto, `client`. */
  initialRole?: SignUpRole;
  /**
   * Plan que el usuario eligió en la landing. Viaja a Clerk en
   * `unsafeMetadata.selectedPlan` para no perder la intención, pero
   * hoy NO determina el plan del Provider: el wizard de onboarding
   * asigna `free` a fuego y no tiene paso de selección de plan.
   */
  initialPlan?: SignUpPlanTier;
  /**
   * Ruta interna a la que volver tras completar el alta, ya saneada por
   * `parseInternalRedirectUrl` en la page. Hoy la manda el flujo de
   * reserva, que empuja aquí al anónimo en el paso de pago. Sólo aplica
   * al rol `client` (ver `resolvePostAuthDestination`).
   */
  redirectUrl?: string | null;
}

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
