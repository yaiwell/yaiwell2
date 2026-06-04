'use client';

import { useUser } from '@clerk/nextjs';
import { useSignUp } from '@clerk/nextjs/legacy';
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { z } from 'zod';

import { useRouter } from '@/i18n/navigation';
import {
  type AuthErrorCode,
  getRoleFromUser,
  mapClerkError,
  resolvePostAuthDestination,
} from '@/lib/auth';

import type {
  SignUpDraft,
  SignUpFieldErrors,
  SignUpPhase,
  SignUpRole,
  SignUpRootError,
} from './SignUpForm.types';

/**
 * Estado inicial del draft. Todos los campos arrancan vacíos para que
 * el usuario empiece desde cero al cargar la pantalla.
 */
const EMPTY_DRAFT: SignUpDraft = {
  fullName: '',
  businessName: '',
  email: '',
  password: '',
  passwordRepeat: '',
  acceptsTerms: false,
};

/**
 * Schemas Zod cuyos `message` son códigos de `AuthErrorCode` (no copy).
 *
 * Mantenerlos como códigos permite que el componente UI traduzca con
 * `Record<AuthErrorCode, string>` preservando el tipado estricto de
 * next-intl. Si añadimos un código nuevo al union, TypeScript marca
 * el Record incompleto y nos obliga a darle copy.
 */
const baseShape = {
  email: z
    .string()
    .trim()
    .min(1, 'emailRequired' satisfies AuthErrorCode)
    .email('emailInvalid' satisfies AuthErrorCode),
  password: z.string().min(8, 'passwordTooShort' satisfies AuthErrorCode),
  passwordRepeat: z.string().min(1, 'passwordRequired' satisfies AuthErrorCode),
  acceptsTerms: z.boolean().refine((v) => v === true, {
    message: 'termsRequired' satisfies AuthErrorCode,
  }),
};

// Refinement reutilizable: contraseña y repetición deben coincidir.
function withPasswordMatch<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const v = value as { password: string; passwordRepeat: string };
    if (v.password && v.passwordRepeat && v.password !== v.passwordRepeat) {
      ctx.addIssue({
        code: 'custom',
        path: ['passwordRepeat'],
        message: 'passwordMismatch' satisfies AuthErrorCode,
      });
    }
  });
}

const clientSchema = withPasswordMatch(
  z.object({
    ...baseShape,
    fullName: z
      .string()
      .trim()
      .min(2, 'fullNameRequired' satisfies AuthErrorCode),
  }),
);

const providerSchema = withPasswordMatch(
  z.object({
    ...baseShape,
    fullName: z
      .string()
      .trim()
      .min(2, 'fullNameRequired' satisfies AuthErrorCode),
    businessName: z
      .string()
      .trim()
      .min(2, 'businessNameRequired' satisfies AuthErrorCode),
  }),
);

/**
 * Hook que gestiona el alta real contra Clerk en flujo de 2 fases:
 *
 *  1. **form**: validación local + `signUp.create` + envío de OTP por
 *     email (`prepareEmailAddressVerification`). Si todo va bien,
 *     pasamos a la fase de verificación.
 *  2. **verification**: el usuario introduce el código de 6 dígitos;
 *     `attemptEmailAddressVerification` lo valida; si `status` es
 *     `complete`, `setActive` y redirect según rol.
 *
 * El rol elegido en la pestaña se persiste en `unsafeMetadata.role`
 * porque `publicMetadata` solo es escribible desde backend. El webhook
 * `user.created` (capa 2) copiará el rol a `publicMetadata`.
 */
export function useSignUpForm() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { user } = useUser();

  const [phase, setPhase] = useState<SignUpPhase>('form');
  const [role, setRole] = useState<SignUpRole>('client');
  const [draft, setDraft] = useState<SignUpDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<SignUpFieldErrors>({});
  const [rootError, setRootError] = useState<SignUpRootError>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schema = useMemo(() => (role === 'provider' ? providerSchema : clientSchema), [role]);

  const updateField = useCallback(
    <K extends keyof SignUpDraft>(field: K, value: SignUpDraft[K]) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      setRootError(null);
    },
    [],
  );

  /**
   * Valida el draft contra el schema activo y rellena el mapa de
   * errores por campo. Devuelve true si todo está OK.
   */
  const validate = useCallback((): boolean => {
    const result = schema.safeParse(draft);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: SignUpFieldErrors = {};
    for (const issue of result.error.issues) {
      const path = issue.path[0];
      if (typeof path === 'string' && !(path in fieldErrors)) {
        // El message de Zod es un AuthErrorCode literal (ver schemas).
        fieldErrors[path as keyof SignUpDraft] = issue.message as AuthErrorCode;
      }
    }
    setErrors(fieldErrors);
    return false;
  }, [draft, schema]);

  /**
   * Mapea un código Clerk al campo más probable para anclar el error.
   * Si el código no es propio de un campo concreto, lo colocamos como
   * `rootError`.
   */
  const applyClerkError = useCallback((code: AuthErrorCode) => {
    switch (code) {
      case 'emailAlreadyExists':
      case 'emailInvalid':
      case 'emailRequired':
        setErrors((prev) => ({ ...prev, email: code }));
        return;
      case 'passwordCompromised':
      case 'passwordTooShort':
      case 'passwordRequired':
        setErrors((prev) => ({ ...prev, password: code }));
        return;
      default:
        setRootError(code);
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;
      if (!validate()) return;
      if (!isLoaded || !signUp) return;

      setIsSubmitting(true);
      setRootError(null);

      try {
        await signUp.create({
          emailAddress: draft.email.trim(),
          password: draft.password,
          // `publicMetadata` no es escribible desde cliente: usamos
          // `unsafeMetadata` y el webhook server-side la promociona.
          unsafeMetadata: {
            role,
            fullName: draft.fullName.trim(),
            ...(role === 'provider' && { businessName: draft.businessName.trim() }),
          },
        });

        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPhase('verification');
      } catch (err) {
        applyClerkError(mapClerkError(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [applyClerkError, draft, isLoaded, isSubmitting, role, signUp, validate],
  );

  const submitVerification = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;
      if (!isLoaded || !signUp) return;
      if (verificationCode.trim().length < 6) {
        setRootError('verificationCodeInvalid');
        return;
      }

      setIsSubmitting(true);
      setRootError(null);

      try {
        const result = await signUp.attemptEmailAddressVerification({
          code: verificationCode.trim(),
        });

        if (result.status === 'complete' && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          const resolvedRole = getRoleFromUser(user) ?? role;
          router.replace(resolvePostAuthDestination(resolvedRole));
          return;
        }
        // Cualquier estado intermedio (missing_requirements, etc.) lo
        // tratamos como código no esperado en MVP.
        setRootError('unknown');
      } catch (err) {
        const code = mapClerkError(err);
        // En verificación, los errores de código van como rootError
        // (no hay campo asociado distinto del propio input de OTP).
        setRootError(code);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isLoaded, isSubmitting, role, router, setActive, signUp, user, verificationCode],
  );

  const switchRole = useCallback((next: SignUpRole) => {
    setRole(next);
    // Al cambiar de pestaña limpiamos errores: los campos requeridos
    // varían según el rol y mantener errores antiguos confundiría.
    setErrors({});
    setRootError(null);
  }, []);

  const resetToForm = useCallback(() => {
    setPhase('form');
    setVerificationCode('');
    setRootError(null);
  }, []);

  return {
    phase,
    role,
    draft,
    errors,
    rootError,
    verificationCode,
    isSubmitting,
    updateField,
    setVerificationCode,
    handleSubmit,
    submitVerification,
    switchRole,
    resetToForm,
  };
}
