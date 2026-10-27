import type { AuthErrorCode } from '@/lib/auth';

import type { GoogleSignUpParams } from '../GoogleAuthButton';
import type { SignUpDraft, SignUpFieldErrors, SignUpRole } from './SignUpForm.types';

/** Resultado de preparar el alta con Google. */
export type GoogleSignUpPreparation =
  | { ok: true; params: GoogleSignUpParams }
  | { ok: false; errors: SignUpFieldErrors };

/**
 * Comprueba lo que el alta con Google necesita del formulario y arma
 * los metadatos de la cuenta.
 *
 * Google ya aporta email y nombre, así que no se piden contraseña ni
 * nombre completo. Sí se exige aceptar las condiciones (igual que con
 * email) y, para profesionales, el nombre del negocio: sin él el panel
 * no sabría cómo llamar al centro.
 *
 * @param role — pestaña activa (cliente o profesional).
 * @param draft — estado actual del formulario.
 * @param initialPlan — plan elegido en `/profesionales`, si lo hay.
 */
export function prepareGoogleSignUp(
  role: SignUpRole,
  draft: SignUpDraft,
  initialPlan?: string | null,
): GoogleSignUpPreparation {
  const errors: SignUpFieldErrors = {};
  const businessName = draft.businessName.trim();

  if (role === 'provider' && businessName.length < 2) {
    errors.businessName = 'businessNameRequired' satisfies AuthErrorCode;
  }
  if (!draft.acceptsTerms) {
    errors.acceptsTerms = 'termsRequired' satisfies AuthErrorCode;
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    params: {
      unsafeMetadata: {
        role,
        ...(role === 'provider' && { businessName }),
        ...(role === 'provider' && initialPlan && { selectedPlan: initialPlan }),
      },
    },
  };
}
