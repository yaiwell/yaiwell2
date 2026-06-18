'use client';

import { useUser } from '@clerk/nextjs';
import { useSignIn } from '@clerk/nextjs/legacy';
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
  ResetPasswordDraft,
  ResetPasswordErrorCode,
  ResetPasswordFieldErrors,
  ResetPasswordPhase,
  ResetPasswordRootError,
} from './ResetPasswordForm.types';

/**
 * Estado inicial del draft. Mantenemos todos los campos en el mismo
 * objeto aunque cada fase solo use un subconjunto: simplifica el
 * `updateField` y permite que el código tipeado a mitad del flujo
 * sobreviva si el usuario vuelve a la fase de email.
 */
const EMPTY_DRAFT: ResetPasswordDraft = {
  email: '',
  code: '',
  newPassword: '',
  newPasswordRepeat: '',
};

/**
 * Schema de la fase 1 (request): sólo necesitamos un email válido.
 * Los `message` son códigos de `AuthErrorCode` literales, no copy,
 * para que el componente UI los traduzca con un `Record` exhaustivo.
 */
const requestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'emailRequired' satisfies AuthErrorCode)
    .email('emailInvalid' satisfies AuthErrorCode),
});

/**
 * Schema de la fase 2 (reset): código de 6 dígitos + nueva contraseña
 * con repetición. Las reglas de fuerza de contraseña las aplica Clerk
 * (longitud mínima del entorno, leaks, etc.) y las recibimos como
 * `passwordCompromised` / `passwordTooShort` vía `mapClerkError`.
 */
const resetSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'verificationCodeInvalid' satisfies AuthErrorCode),
    newPassword: z.string().min(8, 'passwordTooShort' satisfies AuthErrorCode),
    newPasswordRepeat: z.string().min(1, 'passwordRequired' satisfies AuthErrorCode),
  })
  .superRefine((value, ctx) => {
    if (
      value.newPassword &&
      value.newPasswordRepeat &&
      value.newPassword !== value.newPasswordRepeat
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPasswordRepeat'],
        message: 'passwordMismatch' satisfies AuthErrorCode,
      });
    }
  });

/**
 * Hook que gestiona el flujo de recuperación de contraseña contra
 * Clerk en dos fases:
 *
 *  1. **request**: validación local del email + `signIn.create` con
 *     `strategy: 'reset_password_email_code'`. Si el envío sale,
 *     pasamos a la fase reset. Clerk envía el código por email.
 *     Para no revelar si el email existe, cualquier error (incluido
 *     `form_identifier_not_found`) se traduce a un código genérico —
 *     el componente lo presenta como "te hemos enviado un email si
 *     existe la cuenta" (smart enumeration prevention).
 *  2. **reset**: validación local del código y la nueva contraseña +
 *     `signIn.attemptFirstFactor` con la estrategia. Si el `status`
 *     es `complete`, `setActive` y redirect según rol. Si falla, el
 *     código va como rootError.
 */
export function useResetPasswordForm() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { user } = useUser();

  const [phase, setPhase] = useState<ResetPasswordPhase>('request');
  const [draft, setDraft] = useState<ResetPasswordDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<ResetPasswordFieldErrors>({});
  const [rootError, setRootError] = useState<ResetPasswordRootError>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Bandera para mostrar el banner verde antes del redirect — útil
  // como feedback inmediato cuando la red está lenta.
  const [success, setSuccess] = useState(false);

  const schema = useMemo(() => (phase === 'request' ? requestSchema : resetSchema), [phase]);

  const updateField = useCallback(
    <K extends keyof ResetPasswordDraft>(field: K, value: ResetPasswordDraft[K]) => {
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
   * Valida el draft según la fase activa y rellena el mapa de errores
   * por campo. Devuelve true si todo está OK.
   */
  const validate = useCallback((): boolean => {
    const result = schema.safeParse(draft);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: ResetPasswordFieldErrors = {};
    for (const issue of result.error.issues) {
      const path = issue.path[0];
      if (typeof path === 'string' && !(path in fieldErrors)) {
        // El message de Zod es un AuthErrorCode literal (ver schemas).
        fieldErrors[path as keyof ResetPasswordDraft] = issue.message as ResetPasswordErrorCode;
      }
    }
    setErrors(fieldErrors);
    return false;
  }, [draft, schema]);

  /**
   * Mapea un código Clerk al campo más probable.
   *
   * Para `invalidCredentials` (que cubre "email no encontrado") NO
   * anclamos al campo email: si lo hiciéramos, estaríamos confirmando
   * al atacante que el email no existe. Lo dejamos como rootError y
   * el copy del componente debe ser neutro ("si existe, te hemos
   * enviado un email…").
   */
  const applyClerkError = useCallback((code: AuthErrorCode, currentPhase: ResetPasswordPhase) => {
    switch (code) {
      case 'emailInvalid':
      case 'emailRequired':
        setErrors((prev) => ({ ...prev, email: code }));
        return;
      case 'passwordCompromised':
      case 'passwordTooShort':
      case 'passwordRequired':
        if (currentPhase === 'reset') {
          setErrors((prev) => ({ ...prev, newPassword: code }));
          return;
        }
        setRootError(code as ResetPasswordErrorCode);
        return;
      case 'verificationCodeInvalid':
      case 'verificationCodeExpired':
        setErrors((prev) => ({ ...prev, code: code }));
        return;
      case 'invalidCredentials':
      case 'tooManyAttempts':
      case 'sessionExists':
      case 'networkError':
      case 'unknown':
        setRootError(code);
        return;
      default:
        // El union `AuthErrorCode` incluye códigos de sign-up que no
        // aplican aquí (passwordMismatch, fullNameRequired, etc.).
        // Caemos a `unknown` para no exponer copy ruidoso al usuario.
        setRootError('unknown');
    }
  }, []);

  /**
   * Fase 1: pedir el código por email.
   *
   * No revelamos al usuario si el email existe en la BD — el banner
   * verde se muestra siempre que la petición a Clerk no haya disparado
   * un error de red/rate-limit. Si el email no existe, Clerk devuelve
   * `form_identifier_not_found`; lo tragamos silenciosamente y
   * avanzamos a la fase reset (el código nunca llegará). Esto es la
   * política estándar para evitar account enumeration.
   */
  const submitRequest = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;
      if (!validate()) return;
      if (!isLoaded || !signIn) return;

      setIsSubmitting(true);
      setRootError(null);

      try {
        await signIn.create({
          strategy: 'reset_password_email_code',
          identifier: draft.email.trim(),
        });
        setPhase('reset');
      } catch (err) {
        const code = mapClerkError(err);
        // `invalidCredentials` aquí significa "email no registrado".
        // Lo silenciamos y avanzamos a la fase reset igual: protege
        // contra enumeration y deja al usuario seguir la UX normal.
        if (code === 'invalidCredentials') {
          setPhase('reset');
        } else {
          applyClerkError(code, 'request');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [applyClerkError, draft.email, isLoaded, isSubmitting, signIn, validate],
  );

  /**
   * Fase 2: validar código y fijar nueva contraseña.
   *
   * `attemptFirstFactor` con la estrategia
   * `reset_password_email_code` espera `code` y `password`. Si
   * `status === 'complete'`, Clerk crea sesión y `setActive` la
   * activa. Redirigimos según rol resolvido.
   */
  const submitReset = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;
      if (!validate()) return;
      if (!isLoaded || !signIn) return;

      setIsSubmitting(true);
      setRootError(null);

      try {
        const result = await signIn.attemptFirstFactor({
          strategy: 'reset_password_email_code',
          code: draft.code.trim(),
          password: draft.newPassword,
        });

        if (result.status === 'complete' && result.createdSessionId) {
          setSuccess(true);
          await setActive({ session: result.createdSessionId });
          const resolvedRole = getRoleFromUser(user);
          router.replace(resolvePostAuthDestination(resolvedRole));
          return;
        }
        // Estados intermedios (needs_second_factor, etc.) no se
        // soportan en MVP — tratamos como error genérico.
        setRootError('unknown');
      } catch (err) {
        applyClerkError(mapClerkError(err), 'reset');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      applyClerkError,
      draft.code,
      draft.newPassword,
      isLoaded,
      isSubmitting,
      router,
      setActive,
      signIn,
      user,
      validate,
    ],
  );

  const backToRequest = useCallback(() => {
    setPhase('request');
    setErrors({});
    setRootError(null);
    setDraft((prev) => ({ ...prev, code: '', newPassword: '', newPasswordRepeat: '' }));
  }, []);

  return {
    phase,
    draft,
    errors,
    rootError,
    isSubmitting,
    success,
    updateField,
    submitRequest,
    submitReset,
    backToRequest,
  };
}
