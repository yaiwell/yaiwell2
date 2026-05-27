'use client';

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { z } from 'zod';

import { useRouter } from '@/i18n/navigation';

import type { SignUpDraft, SignUpFieldErrors, SignUpRole } from './SignUpForm.types';

/**
 * Duración del "submit fake" en milisegundos.
 *
 * Mantenemos el envío en estado `submitting` durante ~800ms para que el
 * usuario perciba el feedback (spinner + botón bloqueado) antes de la
 * redirección. Cuando enchufemos Clerk real, este timeout desaparece y
 * la redirección la dispara el callback del SDK.
 */
const FAKE_SUBMIT_MS = 800;

/**
 * Construye los schemas Zod usando los mensajes de error traducidos.
 *
 * Se reciben las traducciones desde el componente para que los errores
 * estén siempre en el idioma activo sin tener que duplicar diccionarios
 * dentro del hook.
 */
function buildSchemas(messages: {
  required: string;
  fullNameMin: string;
  businessNameMin: string;
  emailInvalid: string;
  passwordShort: string;
  passwordMismatch: string;
  termsRequired: string;
}) {
  // Reglas comunes a ambas pestañas.
  const baseShape = {
    email: z.string().trim().min(1, messages.required).email(messages.emailInvalid),
    password: z.string().min(8, messages.passwordShort),
    passwordRepeat: z.string().min(1, messages.required),
    acceptsTerms: z
      .boolean()
      .refine((v) => v === true, { message: messages.termsRequired }),
  };

  // Refinement común: la contraseña y su repetición deben coincidir.
  // Lo definimos como helper para reutilizarlo en los dos schemas.
  const withPasswordMatch = <T extends z.ZodTypeAny>(schema: T) =>
    schema.superRefine((value, ctx) => {
      const v = value as { password: string; passwordRepeat: string };
      if (v.password && v.passwordRepeat && v.password !== v.passwordRepeat) {
        ctx.addIssue({
          code: 'custom',
          path: ['passwordRepeat'],
          message: messages.passwordMismatch,
        });
      }
    });

  const clientSchema = withPasswordMatch(
    z.object({
      ...baseShape,
      fullName: z.string().trim().min(2, messages.fullNameMin),
    }),
  );

  const providerSchema = withPasswordMatch(
    z.object({
      ...baseShape,
      fullName: z.string().trim().min(2, messages.fullNameMin),
      businessName: z.string().trim().min(2, messages.businessNameMin),
    }),
  );

  return { clientSchema, providerSchema };
}

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
 * Hook que gestiona el estado, la validación y el envío mock del
 * formulario de registro.
 *
 * Decisión: no hacemos ninguna llamada real a Clerk/Supabase todavía.
 * Cuando exista la integración, este hook seguirá siendo el único
 * punto a tocar (el componente JSX permanecerá intacto). Por eso
 * exponemos `handleSubmit` como una función ya cerrada que el JSX
 * llama directamente desde el `onSubmit` del form.
 */
export function useSignUpForm(messages: Parameters<typeof buildSchemas>[0]) {
  const router = useRouter();
  const [role, setRole] = useState<SignUpRole>('client');
  const [draft, setDraft] = useState<SignUpDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<SignUpFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cachear los schemas para no reconstruirlos en cada render. Cambian
  // solo si cambian los mensajes (idioma), lo cual no ocurre durante
  // la vida del componente sin navegación completa.
  const { clientSchema, providerSchema } = useMemo(() => buildSchemas(messages), [messages]);

  const updateField = useCallback(
    <K extends keyof SignUpDraft>(field: K, value: SignUpDraft[K]) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
      // Limpiamos el error de ese campo al editarlo para no penalizar
      // visualmente al usuario mientras corrige.
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  /**
   * Valida el draft contra el schema correspondiente a la pestaña activa.
   * Devuelve `true` si es válido y rellena `errors` si no.
   */
  const validate = useCallback((): boolean => {
    const schema = role === 'provider' ? providerSchema : clientSchema;
    const result = schema.safeParse(draft);
    if (result.success) {
      setErrors({});
      return true;
    }

    // Aplanamos los issues de Zod a un mapa { campo: mensaje }.
    const fieldErrors: SignUpFieldErrors = {};
    for (const issue of result.error.issues) {
      const path = issue.path[0];
      if (typeof path === 'string' && !(path in fieldErrors)) {
        fieldErrors[path as keyof SignUpDraft] = issue.message;
      }
    }
    setErrors(fieldErrors);
    return false;
  }, [clientSchema, draft, providerSchema, role]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;
      if (!validate()) return;

      setIsSubmitting(true);
      // Esperamos el delay simulado y luego redirigimos según el rol:
      // cliente → home, proveedor → panel. Es una decisión de UX para
      // que cada perfil aterrice donde puede empezar a actuar.
      await new Promise<void>((resolve) => setTimeout(resolve, FAKE_SUBMIT_MS));
      router.push(role === 'provider' ? '/panel' : '/');
    },
    [isSubmitting, role, router, validate],
  );

  const switchRole = useCallback((next: SignUpRole) => {
    setRole(next);
    // Al cambiar de pestaña limpiamos los errores: los campos
    // requeridos varían según el rol y mantener errores antiguos
    // confundiría al usuario.
    setErrors({});
  }, []);

  return {
    role,
    draft,
    errors,
    isSubmitting,
    updateField,
    handleSubmit,
    switchRole,
  };
}
