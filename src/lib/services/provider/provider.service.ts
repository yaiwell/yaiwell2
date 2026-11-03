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

import { ensureSpanishIfAny } from '@/lib/i18n';
import type { StorableLocalizedText } from '@/lib/i18n';
import { weeklyScheduleSchema } from '@/lib/services/availability';
import type { WeeklySchedule } from '@/lib/services/availability';
import type { LocalizedText } from '@/types/domain';

import { parseGeolocatedAddress } from './provider.address';
import {
  ProviderHasNoProfessionalError,
  ProviderHasTeamError,
  ProviderNotFoundError,
} from './provider.errors';
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
 * La dirección se valida ANTES de leer nada de BD y se convierte en un
 * `GeolocatedAddress`: o llegan texto y coordenadas, o no se guarda
 * nada. Preferimos abortar la operación entera (nombre y descripción
 * incluidos) a persistir una calle nueva sobre el punto geográfico
 * viejo, que es el fallo silencioso que este flujo tenía.
 *
 * @param providerId — id del Provider autorizado (ya validado por el caller).
 * @param input — datos crudos del formulario; se validan con Zod.
 * @throws ProviderLocationRequiredError si la dirección llega sin coordenadas válidas.
 * @throws ProviderNotFoundError si el Provider no existe o está soft-deleted.
 * @throws ZodError si el input no pasa la validación.
 */
export async function updateProviderSettings(providerId: string, input: unknown): Promise<void> {
  const data = updateProviderSettingsSchema.parse(input);
  const address = parseGeolocatedAddress(input);

  // Necesitamos la descripción existente para fusionar el parche del
  // locale activo sin perder las traducciones de los demás idiomas.
  const existing = await providerRepository.findSettings(providerId);
  if (!existing) {
    throw new ProviderNotFoundError();
  }

  const mergedDescription = mergeDescription(existing.description, data.description);

  const updatedRows = await providerRepository.updateSettings(providerId, {
    businessName: data.businessName,
    vatNumber: data.vatNumber,
    description: mergedDescription,
    address,
  });

  // El UPDATE va por raw SQL, así que Prisma no lanza si no encuentra
  // fila: lo comprobamos a mano para cubrir la carrera de un borrado
  // entre la lectura y la escritura.
  if (updatedRows === 0) {
    throw new ProviderNotFoundError();
  }

  // Contacto privado en su propia tabla, cerrada a la clave pública. Solo
  // se escribe si la llamada lo trae: una llamada sin esos campos no debe
  // borrar el contacto guardado.
  if (data.contactPhone !== undefined || data.contactEmail !== undefined) {
    await providerRepository.upsertContact(providerId, {
      phone: data.contactPhone,
      email: data.contactEmail,
    });
  }
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
): StorableLocalizedText {
  if (!patch) return ensureSpanishIfAny(existing);
  const hasAny = Boolean(patch.es || patch.ca || patch.en || patch.de);
  if (!hasAny) return ensureSpanishIfAny(existing);
  // `ensureSpanishIfAny` y no un spread a pelo: sin castellano el texto
  // sale EN BLANCO en la ficha pública para todo el mundo, porque es el
  // último eslabón de la cadena de fallback. Es el mismo guardián que
  // aplica el alta de servicios.
  return ensureSpanishIfAny({ ...existing, ...patch });
}

/**
 * Devuelve el `WeeklySchedule` del único profesional del negocio, listo
 * para precargar el editor de `/panel/centro`.
 *
 * Con varios profesionales activos cada uno tiene su horario y se edita
 * en `/panel/equipo`: devolvemos `null` y la página enlaza allí. Con uno
 * solo (el autónomo) el editor sigue en «Mi negocio», como siempre.
 *
 * Si el JSON en BD no encaja con la forma esperada (caso histórico de
 * un seed antiguo), devolvemos `EMPTY_SCHEDULE` en lugar de lanzar:
 * la UI puede pintarse vacía y el usuario lo rellena. La validación
 * estricta sí se aplica en `updateProviderSchedule` (escritura).
 *
 * @returns el horario, o `null` si el negocio tiene equipo.
 * @throws ProviderHasNoProfessionalError si no hay Professional.
 */
export async function getProviderSchedule(providerId: string): Promise<WeeklySchedule | null> {
  const [professional, activeCount] = await Promise.all([
    providerRepository.findFirstProfessional(providerId),
    providerRepository.countActiveProfessionals(providerId),
  ]);
  if (!professional) {
    throw new ProviderHasNoProfessionalError();
  }
  if (activeCount > 1) return null;
  const parsed = weeklyScheduleSchema.safeParse(professional.schedule);
  return parsed.success ? parsed.data : EMPTY_SCHEDULE;
}

/**
 * Persiste el horario semanal del único Professional del provider.
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
 * @throws ProviderHasTeamError — si tiene varios profesionales activos:
 *   cada horario se guarda desde `/panel/equipo`.
 */
export async function updateProviderSchedule(providerId: string, input: unknown): Promise<void> {
  const schedule = weeklyScheduleSchema.parse(input);

  // Confirmamos que el provider exista para devolver un error específico
  // si el caller llamó con un id huérfano (Provider hizo soft-delete).
  const existing = await providerRepository.findSettings(providerId);
  if (!existing) {
    throw new ProviderNotFoundError();
  }

  const [professional, activeCount] = await Promise.all([
    providerRepository.findFirstProfessional(providerId),
    providerRepository.countActiveProfessionals(providerId),
  ]);
  if (!professional) {
    throw new ProviderHasNoProfessionalError();
  }
  if (activeCount > 1) {
    throw new ProviderHasTeamError();
  }

  await providerRepository.updateProfessionalSchedule(
    professional.id,
    schedule as unknown as Prisma.InputJsonValue,
  );
}
