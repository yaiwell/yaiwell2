'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { z } from 'zod';

import { useRouter } from '@/i18n/navigation';

import type { SignInDraft, SignInErrorCode, SignInRole, SignInStatus } from './SignInForm.types';

/**
 * Schema mínimo de validación del formulario.
 *
 * Sólo validamos lo que tiene sentido para un mock visual: email con
 * formato razonable y contraseña no vacía. Cuando integremos Clerk real,
 * el servicio de auth aplicará reglas más estrictas (longitud mínima,
 * detección de leaks, etc.).
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
 * Hook que centraliza el estado, la validación y el submit mock del
 * formulario de sign-in.
 *
 * Devuelve un API estrecho y tipado para que el componente de UI sea
 * puramente presentacional. El submit hace un pequeño delay artificial
 * (600 ms) para que el spinner se aprecie y luego redirige al destino
 * que corresponde según el rol seleccionado.
 */
export function useSignInForm(initialRole: SignInRole = 'client') {
  const router = useRouter();
  const [role, setRole] = useState<SignInRole>(initialRole);
  const [draft, setDraft] = useState<SignInDraft>(initialDraft);
  const [status, setStatus] = useState<SignInStatus>('idle');
  // Almacenamos un código de error tipado para que el componente lo
  // traduzca con next-intl. Usar una unión literal (no `string`) permite
  // que el helper `t` mantenga su tipado estricto en el sitio de llamada.
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

      const parsed = signInSchema.safeParse(draft);
      if (!parsed.success) {
        // Distinguimos email vacío de email inválido porque el copy
        // editorial cambia ("requerido" vs "formato incorrecto").
        const emailValue = draft.email.trim();
        setErrorCode(emailValue.length === 0 ? 'emailRequired' : 'emailInvalid');
        setStatus('error');
        return;
      }

      setStatus('submitting');
      setErrorCode(null);

      // Mock de latencia: en producción aquí llamaríamos al SDK de Clerk.
      // 600 ms es suficiente para que el spinner se perciba sin frustrar.
      await new Promise((resolve) => {
        setTimeout(resolve, 600);
      });

      // Destino post-login según rol: cliente al feed, proveedor al panel.
      const destination = role === 'provider' ? '/panel' : '/';
      router.push(destination);
    },
    [draft, role, router],
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
