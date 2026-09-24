'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { auth } from '@clerk/nextjs/server';

import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import {
  buildLocalizedText,
  EmptyLocalizedTextError,
  ensureSpanishIfAny,
  mergeLocalizedText,
} from '@/lib/i18n';
import {
  CategoryNotFoundError,
  createFirstServiceForProvider,
  ProviderForOnboardingNotFoundError,
} from '@/lib/services/provider-onboarding';
import { ensureUserFromClerk } from '@/lib/services/user';
import type { LocalizedText } from '@/types/domain';

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
      code:
        | 'VALIDATION'
        | 'CATEGORY_NOT_FOUND'
        | 'PROVIDER_NOT_FOUND'
        | 'SERVICE_NOT_FOUND'
        | 'FORBIDDEN'
        | 'INTERNAL';
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
 * El locale activo etiqueta `name`/`description`, pero **nunca es la
 * única clave**: `buildLocalizedText` duplica el texto en `es` si el
 * proveedor escribe en ca/en/de. Sin eso el servicio nacía sin nombre
 * público (P0 nº 4 de `docs/pantallas-2026-09-23.md`).
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

  // `LocalizedText` con el castellano garantizado: si el panel está en
  // ca/en/de el texto se duplica en `es` para que la ficha pública, el
  // buscador y el flujo de reserva tengan siempre algo que pintar.
  // La decisión de producto está razonada en `@/lib/i18n/localizedText`.
  let name;
  let description;
  try {
    name = buildLocalizedText(locale, raw.name);
    description = raw.description.trim() ? buildLocalizedText(locale, raw.description) : undefined;
  } catch (err) {
    if (err instanceof EmptyLocalizedTextError) {
      return { ok: false, code: 'VALIDATION', message: err.message };
    }
    throw err;
  }

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

/**
 * Server action de edición de un Service existente del provider activo.
 *
 * Reutiliza el mismo shape `RawInput` que el alta (mismo formulario),
 * y aplica las mismas reglas de validación. La categoría se elige
 * por la hoja más profunda seleccionada (subtype > type > root).
 *
 * Para el `LocalizedText`, **fusionamos** la entrada del locale activo
 * con las claves existentes de los otros idiomas para no perderlas en
 * la edición (un editor que solo escribe ES no debe borrar la versión
 * CA que el usuario haya añadido en el futuro).
 */
export async function updateServiceAction(
  serviceId: string,
  locale: AppLocale,
  raw: RawInput,
): Promise<CreateServiceActionState> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { ok: false, code: 'PROVIDER_NOT_FOUND', message: 'No autenticado.' };
  }

  const { id: providerId } = await requireCurrentProvider(locale);

  // Ownership: traemos el Service para verificar que pertenece al
  // provider activo y para tener los `name`/`description` actuales —
  // los necesitamos para fusionar el locale editado con el resto.
  const existing = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      providerId: true,
      deletedAt: true,
      name: true,
      description: true,
    },
  });
  if (!existing || existing.deletedAt) {
    return { ok: false, code: 'SERVICE_NOT_FOUND' };
  }
  if (existing.providerId !== providerId) {
    return { ok: false, code: 'FORBIDDEN' };
  }

  const categoryId = raw.subtypeId || raw.typeId || raw.rootCategoryId;
  if (!categoryId) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'Selecciona al menos una categoría.',
    };
  }

  const durationMinutes = Number(raw.durationMinutes);
  const priceCents = Math.round(Number(raw.priceEuros) * 100);

  if (!Number.isFinite(durationMinutes) || durationMinutes < 5) {
    return { ok: false, code: 'VALIDATION', message: 'Duración inválida.' };
  }
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { ok: false, code: 'VALIDATION', message: 'Precio inválido.' };
  }

  if (!raw.name.trim()) {
    return { ok: false, code: 'VALIDATION', message: 'El nombre no puede estar vacío.' };
  }

  // Fusión defensiva: conservamos las claves de los demás idiomas
  // (en/de/ca) que el usuario pudiera tener traducidas, y sobreescribimos
  // solo la del locale activo. Si BD devuelve un JSON degenerado, lo
  // tratamos como objeto vacío para arrancar limpio.
  //
  // `mergeLocalizedText` añade dos garantías sobre el spread a mano que
  // había aquí: rellena `es` si el registro venía sin castellano (dato
  // anterior al guardián) y arrastra el castellano cuando era un
  // duplicado espejo del idioma que se está editando.
  const existingName = (existing.name as unknown as LocalizedText) ?? {};
  const existingDescription = (existing.description as unknown as LocalizedText) ?? {};

  let nextName;
  let nextDescription;
  try {
    nextName = mergeLocalizedText(existingName, locale, raw.name);
    const trimmedDescription = raw.description.trim();
    // Descripción no tocada: la conservamos, pero curamos el castellano
    // si el registro es anterior al guardián y tenía texto solo en otro
    // idioma. Una descripción vacía sigue siendo válida.
    nextDescription = trimmedDescription
      ? mergeLocalizedText(existingDescription, locale, trimmedDescription)
      : ensureSpanishIfAny(existingDescription);
  } catch (err) {
    if (err instanceof EmptyLocalizedTextError) {
      return { ok: false, code: 'VALIDATION', message: err.message };
    }
    throw err;
  }

  // Verificamos la categoría existe antes de tocar BD. Sin esto, un
  // categoryId obsoleto/inventado generaría un FK error opaco.
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    return { ok: false, code: 'CATEGORY_NOT_FOUND' };
  }

  try {
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        categoryId,
        name: nextName as unknown as object,
        description: nextDescription as unknown as object,
        durationMinutes,
        priceCents,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return { ok: false, code: 'VALIDATION', message: err.issues[0]?.message };
    }
    console.error('[panel/servicios/[id]/editar] updateServiceAction error:', err);
    return { ok: false, code: 'INTERNAL' };
  }

  revalidatePath(`/${locale}/panel/servicios`);
  redirect({ href: '/panel/servicios', locale });

  return { ok: true };
}
