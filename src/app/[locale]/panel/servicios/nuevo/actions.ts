'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { auth } from '@clerk/nextjs/server';

import { requireCurrentProvider } from '@/lib/auth/server';
import {
  CategoryNotFoundError,
  createFirstServiceForProvider,
  ProviderForOnboardingNotFoundError,
} from '@/lib/services/provider-onboarding';
import { ensureUserFromClerk } from '@/lib/services/user';

/**
 * Resultado serializable de la server action. El form lo recibe en su
 * estado de Promise y muestra un toast/banner si `ok === false`.
 *
 * Si la action triunfa, no retornamos resultado al cliente: hacemos
 * `redirect` server-side que aborta la ejecución y navega.
 */
export type CreateServiceActionState =
  | { ok: true }
  | {
      ok: false;
      /**
       * Código tipado para que el cliente decida copy. Mantenemos un
       * conjunto pequeño para no filtrar detalles internos.
       */
      code: 'VALIDATION' | 'CATEGORY_NOT_FOUND' | 'PROVIDER_NOT_FOUND' | 'INTERNAL';
      /** Mensaje legible opcional para mostrar al usuario. */
      message?: string;
    };

interface RawInput {
  rootCategoryId: string | null;
  typeId: string | null;
  subtypeId: string | null;
  name: string;
  description: string;
  durationMinutes: string;
  priceEuros: string;
}

/**
 * Server action que persiste un nuevo Service del provider autenticado.
 *
 * Reutiliza `createFirstServiceForProvider` del módulo de onboarding —
 * el "first" es un misnomer histórico: la lógica es idéntica para
 * cualquier alta de servicio (validación, ownership, categoría, herencia
 * de profesional autónomo). Refactor de nombre queda como TODO.
 *
 * El locale activo se usa para envolver `name`/`description` como
 * `LocalizedText` con solo esa clave rellena — más adelante, si añadimos
 * un editor de traducciones, el resto de idiomas se completarán al
 * vuelo o por traducción asistida.
 *
 * @param locale  locale activo (para el redirect y para etiquetar el
 *   `LocalizedText`). Se valida client-side al construir el form.
 * @param raw     borrador del formulario tal como lo envía el cliente.
 */
export async function createServiceAction(
  locale: AppLocale,
  raw: RawInput,
): Promise<CreateServiceActionState> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { ok: false, code: 'PROVIDER_NOT_FOUND', message: 'No autenticado.' };
  }

  // `ensureUserFromClerk` garantiza el row interno de User existe
  // (mismo flujo que usan los endpoints del onboarding). Defensa contra
  // race: provider real recién creado cuyo webhook llega con retraso.
  const internal = await ensureUserFromClerk(clerkId);

  const { id: providerId } = await requireCurrentProvider(locale);

  // Elegimos la categoría más específica seleccionada (hoja del árbol).
  // Si solo eligió raíz, se queda la raíz; aceptable para servicios
  // genéricos. El usuario decide cuánta granularidad quiere.
  const categoryId = raw.subtypeId || raw.typeId || raw.rootCategoryId;
  if (!categoryId) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'Selecciona al menos una categoría.',
    };
  }

  // Conversión a tipos esperados por el service. `durationMinutes` y
  // `priceEuros` llegan como strings desde el form (inputs `type=number`
  // pero los manejamos como strings en el draft para evitar NaN durante
  // la edición).
  const durationMinutes = Number(raw.durationMinutes);
  const priceCents = Math.round(Number(raw.priceEuros) * 100);

  if (!Number.isFinite(durationMinutes) || durationMinutes < 5) {
    return { ok: false, code: 'VALIDATION', message: 'Duración inválida.' };
  }
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { ok: false, code: 'VALIDATION', message: 'Precio inválido.' };
  }

  // `LocalizedText` con solo la clave del locale activo. Cumple el
  // schema (refine: al menos un idioma) y se completa más adelante con
  // un editor de traducciones.
  const name = { [locale]: raw.name.trim() };
  const description = raw.description.trim() ? { [locale]: raw.description.trim() } : undefined;

  try {
    await createFirstServiceForProvider(
      providerId,
      {
        categoryId,
        name,
        description,
        durationMinutes,
        priceCents,
      },
      internal.id,
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return { ok: false, code: 'VALIDATION', message: err.issues[0]?.message };
    }
    if (err instanceof CategoryNotFoundError) {
      return { ok: false, code: 'CATEGORY_NOT_FOUND' };
    }
    if (err instanceof ProviderForOnboardingNotFoundError) {
      return { ok: false, code: 'PROVIDER_NOT_FOUND' };
    }
    console.error('[panel/servicios/nuevo] createServiceAction error:', err);
    return { ok: false, code: 'INTERNAL' };
  }

  // Invalida el cache del listado para que la próxima carga vea el
  // servicio recién creado.
  revalidatePath(`/${locale}/panel/servicios`);
  redirect({ href: '/panel/servicios', locale });

  // `redirect` lanza un error especial de Next; este return solo existe
  // para satisfacer al type checker (nunca se ejecuta).
  return { ok: true };
}
