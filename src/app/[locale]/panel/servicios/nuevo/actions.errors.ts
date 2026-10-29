import { ZodError } from 'zod';

import { EmptyLocalizedTextError } from '@/lib/i18n';
import { PlanServiceLimitReachedError } from '@/lib/services/billing/billing.plan-limits';
import {
  CategoryNotFoundError,
  ProviderForOnboardingNotFoundError,
} from '@/lib/services/provider-onboarding';

/**
 * Resultado serializable de las actions de alta y edición de servicios.
 * El form lo recibe en su estado de Promise y muestra un banner si
 * `ok === false`.
 *
 * Si la action triunfa, no retornamos resultado al cliente: hacemos
 * `redirect` server-side que aborta la ejecución y navega.
 *
 * Vive fuera de `actions.ts` porque un fichero `'use server'` solo puede
 * exportar funciones async: aquí van el tipo y el mapeo de errores.
 */
export type CreateServiceActionState =
  | { ok: true }
  | {
      ok: false;
      /**
       * Código tipado para que el cliente decida copy. Mantenemos un
       * conjunto pequeño para no filtrar detalles internos.
       */
      code:
        | 'VALIDATION'
        | 'CATEGORY_NOT_FOUND'
        | 'PROVIDER_NOT_FOUND'
        | 'SERVICE_NOT_FOUND'
        | 'FORBIDDEN'
        // El plan ya no admite más servicios publicados: la UI ofrece mejorarlo.
        | 'PLAN_LIMIT_REACHED'
        | 'INTERNAL';
      /** Mensaje legible opcional para mostrar al usuario. */
      message?: string;
    };

type ServiceActionFailure = Extract<CreateServiceActionState, { ok: false }>;

/** Fallo de validación con mensaje para el usuario. */
export function validationFailure(message?: string): ServiceActionFailure {
  return { ok: false, code: 'VALIDATION', message };
}

/**
 * Traduce el error al construir el `LocalizedText` del formulario. Los
 * errores inesperados se relanzan: no son culpa del usuario.
 */
export function localizedTextFailure(err: unknown): ServiceActionFailure {
  if (err instanceof EmptyLocalizedTextError) return validationFailure(err.message);
  throw err;
}

/**
 * Traduce los errores de `createFirstServiceForProvider` a códigos
 * estables. Los desconocidos se loguean y salen como `INTERNAL`.
 */
export function createServiceFailure(err: unknown): ServiceActionFailure {
  if (err instanceof ZodError) return validationFailure(err.issues[0]?.message);
  if (err instanceof CategoryNotFoundError) return { ok: false, code: 'CATEGORY_NOT_FOUND' };
  if (err instanceof ProviderForOnboardingNotFoundError) {
    return { ok: false, code: 'PROVIDER_NOT_FOUND' };
  }
  if (err instanceof PlanServiceLimitReachedError) {
    return { ok: false, code: 'PLAN_LIMIT_REACHED' };
  }
  console.error('[panel/servicios/nuevo] createServiceAction error:', err);
  return { ok: false, code: 'INTERNAL' };
}

/** Traduce los errores al guardar la edición de un servicio. */
export function updateServiceFailure(err: unknown): ServiceActionFailure {
  if (err instanceof ZodError) return validationFailure(err.issues[0]?.message);
  console.error('[panel/servicios/[id]/editar] updateServiceAction error:', err);
  return { ok: false, code: 'INTERNAL' };
}
