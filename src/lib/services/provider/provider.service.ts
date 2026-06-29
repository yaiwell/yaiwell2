import 'server-only';

/**
 * Servicio del dominio `provider` (operaciones del panel).
 *
 * Orquesta el repositorio con las reglas de negocio mínimas necesarias
 * para los updates lanzados desde `/panel/centro`:
 *  - Validación Zod del input.
 *  - Fusión defensiva de `LocalizedText`: si el usuario edita solo el
 *    locale activo, conservamos las traducciones existentes de los demás
 *    idiomas. Mismo patrón que `updateServiceAction` del listado de
 *    servicios.
 *  - Error tipado `ProviderNotFoundError` para que la action distinga
 *    el caso "borrado entre llamadas" del fallo genérico.
 *
 * La ownership la garantiza el caller (`requireCurrentProvider`); el
 * service trabaja con un `providerId` ya autorizado.
 */

import type { LocalizedText } from '@/types/domain';

import { ProviderNotFoundError } from './provider.errors';
import { providerRepository } from './provider.repository';
import { updateProviderSettingsSchema } from './provider.validation';

/**
 * Actualiza los campos editables del Provider desde `/panel/centro`.
 *
 * @param providerId — id del Provider autorizado (ya validado por el caller).
 * @param input — datos crudos del formulario; se validan con Zod.
 * @throws ProviderNotFoundError si el Provider no existe o está soft-deleted.
 * @throws ZodError si el input no pasa la validación.
 */
export async function updateProviderSettings(providerId: string, input: unknown): Promise<void> {
  const data = updateProviderSettingsSchema.parse(input);

  // Necesitamos la descripción existente para fusionar el parche del
  // locale activo sin perder las traducciones de los demás idiomas.
  const existing = await providerRepository.findSettings(providerId);
  if (!existing) {
    throw new ProviderNotFoundError();
  }

  const mergedDescription = mergeDescription(existing.description, data.description);

  await providerRepository.updateSettings(providerId, {
    businessName: data.businessName,
    vatNumber: data.vatNumber,
    description: mergedDescription,
    address: data.address,
  });
}

/**
 * Fusiona la descripción existente con el parche del locale activo.
 *
 * Conserva todas las claves previas y sobreescribe solo las que vengan
 * en `patch`. Si `patch` es undefined o vacío, devolvemos `existing`
 * tal cual — el usuario no tocó la descripción.
 */
function mergeDescription(
  existing: LocalizedText,
  patch: Partial<LocalizedText> | undefined,
): LocalizedText {
  if (!patch) return existing;
  const hasAny = Boolean(patch.es || patch.ca || patch.en || patch.de);
  if (!hasAny) return existing;
  return { ...existing, ...patch };
}
