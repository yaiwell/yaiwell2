/**
 * Tipos del botón «Continuar con Google».
 */

/** Rol con el que se crea la cuenta si el alta pasa por Google. */
export type GoogleSignUpRole = 'client' | 'provider';

/**
 * Datos que el formulario de registro entrega antes de saltar a Google.
 *
 * Van en `unsafeMetadata` igual que en el alta con email: el webhook
 * `user.created` promociona el rol a `publicMetadata`.
 */
export interface GoogleSignUpParams {
  unsafeMetadata: {
    role: GoogleSignUpRole;
    businessName?: string;
    selectedPlan?: string;
  };
}

/** Errores que el botón sabe contar. */
export type GoogleAuthErrorCode = 'networkError' | 'unknown';

/** Props del botón. */
export interface GoogleAuthButtonProps {
  /**
   * `signIn` en `/entrar`; `signUp` en `/registro`. Clerk transfiere
   * solo de uno a otro si la cuenta existe o no, así que el modo
   * decide sobre todo qué datos de alta acompañan al salto.
   */
  mode: 'signIn' | 'signUp';
  /** Ruta interna a la que volver tras entrar (ya saneada por la page). */
  redirectUrl?: string | null;
  /**
   * Solo en `signUp`: valida lo que el alta necesita (condiciones, nombre
   * del negocio) y devuelve los datos, o `null` si falta algo. El
   * formulario pinta sus propios errores en ese caso.
   */
  prepareSignUp?: () => GoogleSignUpParams | null;
}
