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

import type { Prisma } from '@prisma/client';

import { weeklyScheduleSchema } from '@/lib/services/availability';
import type { WeeklySchedule } from '@/lib/services/availability';
import type { LocalizedText } from '@/types/domain';

import { ProviderHasNoProfessionalError, ProviderNotFoundError } from './provider.errors';
import { providerRepository } from './provider.repository';
import { updateProviderSettingsSchema } from './provider.validation';

/**
 * Horario semanal vacío (todos los días cerrados). Lo usamos como
 * fallback cuando el `Professional.schedule` en BD no encaja con
 * `WeeklySchedule` — caso raro pero posible si el schema evolucionó.
 */
const EMPTY_SCHEDULE: WeeklySchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

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

/**
 * Devuelve el `WeeklySchedule` actual del primer Professional del
 * provider, listo para precargar la UI del editor en `/panel/centro`.
 *
 * Si el JSON en BD no encaja con la forma esperada (caso histórico de
 * un seed antiguo), devolvemos `EMPTY_SCHEDULE` en lugar de lanzar:
 * la UI puede pintarse vacía y el usuario lo rellena. La validación
 * estricta sí se aplica en `updateProviderSchedule` (escritura).
 *
 * @throws ProviderHasNoProfessionalError si no hay Professional.
 */
export async function getProviderSchedule(providerId: string): Promise<WeeklySchedule> {
  const professional = await providerRepository.findFirstProfessional(providerId);
  if (!professional) {
    throw new ProviderHasNoProfessionalError();
  }
  const parsed = weeklyScheduleSchema.safeParse(professional.schedule);
  return parsed.success ? parsed.data : EMPTY_SCHEDULE;
}

/**
 * Persiste el horario semanal del primer Professional del provider.
 *
 * Reutiliza `weeklyScheduleSchema` del módulo `availability` para
 * mantener UNA sola fuente de verdad sobre la forma del schedule
 * (mismo motor de cálculo, misma validación de entrada).
 *
 * @param providerId — id autorizado por el caller (`requireCurrentProvider`).
 * @param input — JSON crudo del cliente; se valida con Zod.
 * @throws ZodError — si el input no es un `WeeklySchedule` válido.
 * @throws ProviderHasNoProfessionalError — si el provider no tiene
 *   Professional al que asignar el horario.
 * @throws ProviderNotFoundError — si el provider no existe.
 */
export async function updateProviderSchedule(providerId: string, input: unknown): Promise<void> {
  const schedule = weeklyScheduleSchema.parse(input);

  // Confirmamos que el provider exista para devolver un error específico
  // si el caller llamó con un id huérfano (Provider hizo soft-delete).
  const existing = await providerRepository.findSettings(providerId);
  if (!existing) {
    throw new ProviderNotFoundError();
  }

  const professional = await providerRepository.findFirstProfessional(providerId);
  if (!professional) {
    throw new ProviderHasNoProfessionalError();
  }

  await providerRepository.updateProfessionalSchedule(
    professional.id,
    schedule as unknown as Prisma.InputJsonValue,
  );
}
