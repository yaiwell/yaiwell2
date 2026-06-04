'use client';

import { useUser } from '@clerk/nextjs';
import { useSignIn } from '@clerk/nextjs/legacy';
import { useCallback, useState, type FormEvent } from 'react';
import { z } from 'zod';

import { useRouter } from '@/i18n/navigation';
import { getRoleFromUser, mapClerkError, resolvePostAuthDestination } from '@/lib/auth';

import type { SignInDraft, SignInErrorCode, SignInRole, SignInStatus } from './SignInForm.types';

/**
 * Validación local mínima antes de pegar a Clerk.
 *
 * El SDK aplica reglas más estrictas (longitud, leaks, etc.) y nos
 * devuelve códigos tipados que mapeamos via `mapClerkError`. Aquí solo
 * filtramos el caso obvio (email vacío / sin arroba) para ahorrar un
 * round-trip cuando es claramente inválido en cliente.
 */
const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  remember: z.boolean(),
});

/** Estado inicial del draft del formulario. */
const initialDraft: SignInDraft = {
  email: '',
  password: '',
  remember: false,
};

/**
 * Hook que centraliza el estado y el envío real del formulario de
 * sign-in contra Clerk (headless).
 *
 * Flujo:
 *  1. Validación local con Zod (email + password no vacíos).
 *  2. `signIn.create({ identifier, password })`.
 *  3. Si `status === 'complete'`, `setActive({ session })`.
 *  4. Lectura del rol con `getRoleFromUser` (publicMetadata con
 *     fallback a unsafeMetadata) y redirect con `router.replace` a
 *     `/` o `/panel` según el rol — usamos replace para que el back
 *     del navegador no devuelva al usuario a `/entrar`.
 *  5. Cualquier error de Clerk se traduce a `AuthErrorCode` via
 *     `mapClerkError` para que el componente lo pinte con i18n.
 */
export function useSignInForm(initialRole: SignInRole = 'client') {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { user } = useUser();

  const [role, setRole] = useState<SignInRole>(initialRole);
  const [draft, setDraft] = useState<SignInDraft>(initialDraft);
  const [status, setStatus] = useState<SignInStatus>('idle');
  // Código tipado para que el componente UI lo traduzca con next-intl
  // sin perder el tipado estricto (rechaza claves dinámicas).
  const [errorCode, setErrorCode] = useState<SignInErrorCode | null>(null);

  const updateDraft = useCallback((patch: Partial<SignInDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    // Cualquier edición limpia el error anterior para no asustar al
    // usuario con un mensaje viejo mientras corrige el campo.
    setErrorCode(null);
    setStatus('idle');
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      // Validación local: distinguimos email vacío de email inválido
      // porque el copy editorial cambia ("requerido" vs "formato").
      const parsed = signInSchema.safeParse(draft);
      if (!parsed.success) {
        const emailValue = draft.email.trim();
        setErrorCode(emailValue.length === 0 ? 'emailRequired' : 'emailInvalid');
        setStatus('error');
        return;
      }

      // Esperamos a que Clerk termine de hidratarse antes de enviar.
      // Si el usuario clica muy rápido tras el primer paint, volvemos
      // silenciosamente y el siguiente render disparará el botón.
      if (!isLoaded || !signIn) return;

      setStatus('submitting');
      setErrorCode(null);

      try {
        const result = await signIn.create({
          identifier: draft.email.trim(),
          password: draft.password,
        });

        if (result.status === 'complete' && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          // Tras setActive `user` todavía puede ser null durante un
          // tick; el rol siempre puede leerse luego del redirect, pero
          // intentamos resolverlo aquí para acertar al primer destino.
          const resolvedRole = getRoleFromUser(user);
          router.replace(resolvePostAuthDestination(resolvedRole));
          return;
        }

        // Si Clerk devuelve un status intermedio (2FA, verificación
        // pendiente) lo tratamos como error genérico — el flujo MVP
        // no contempla 2FA todavía.
        setErrorCode('unknown');
        setStatus('error');
      } catch (err) {
        setErrorCode(narrowErrorCode(mapClerkError(err)));
        setStatus('error');
      }
    },
    [draft, isLoaded, router, setActive, signIn, user],
  );

  return {
    role,
    setRole,
    draft,
    updateDraft,
    status,
    errorCode,
    handleSubmit,
  };
}

/**
 * Restringe el `AuthErrorCode` global al subconjunto que SignIn
 * puede mostrar. Si el mapeo devuelve un código no aplicable (p.ej.
 * `passwordTooShort`, propio de sign-up), caemos a `'unknown'`.
 */
function narrowErrorCode(code: ReturnType<typeof mapClerkError>): SignInErrorCode {
  switch (code) {
    case 'emailRequired':
    case 'emailInvalid':
    case 'passwordRequired':
    case 'invalidCredentials':
    case 'tooManyAttempts':
    case 'sessionExists':
    case 'networkError':
    case 'unknown':
      return code;
    default:
      return 'unknown';
  }
}
