import 'server-only';

import { ZodError } from 'zod';

import { pickLocalized } from '@/lib/i18n';
import type { AppLocale } from '@/i18n/routing';
import type { LocalizedText } from '@/types/domain';

import {
  InvalidVerificationStatusError,
  ProviderNotFoundForVerificationError,
  RejectionNotesRequiredError,
} from './verification.errors';
import { verificationRepository } from './verification.repository';
import { approveProviderSchema, rejectProviderSchema } from './verification.validation';
import type { AdminVerificationRequest, VerificationDocument } from './verification.types';

/**
 * Service del dominio `verification`.
 *
 * Orquesta el repositorio con las reglas de la cola admin y mapea las
 * filas crudas al shape `AdminVerificationRequest` que ya consumen los
 * componentes (`VerificationsQueue`, `VerificationDetail`) — así la
 * UI no cambia.
 *
 * Decisiones para MVP:
 *  - `contactPhone` no se recoge en el wizard → cadena vacía. La UI
 *    pinta '—' o muestra el campo vacío; deuda explícita en TODO.
 *  - `documents` vendrá vacío hasta que se suban en el onboarding. La
 *    tabla `verification_requests.documents` está lista para almacenarlos.
 *  - `providerCity` se rellena con `Provider.address` íntegro (no
 *    parseamos): la dirección suele incluir ciudad y barrio, y la UI
 *    de la cola lo presenta como `ciudad · categoría` — funciona.
 */

/**
 * Helper para serializar `description` JSONB → string en el locale
 * activo. Usa `pickLocalized` que aplica fallback `en/de → es`.
 */
function pickDescription(raw: unknown, locale: AppLocale): string {
  const desc = (raw ?? {}) as Partial<LocalizedText>;
  // pickLocalized exige `es` y `ca` requeridos en el tipo, así que
  // normalizamos los opcionales antes de delegar.
  const normalized: LocalizedText = {
    es: desc.es ?? '',
    ca: desc.ca ?? '',
    en: desc.en,
    de: desc.de,
  };
  return pickLocalized(normalized, locale);
}

/**
 * Helper para serializar `Category.name` (JSONB) → string en el
 * locale activo. Si la categoría viene `null` (provider sin categoría
 * todavía), devolvemos cadena vacía y la UI muestra solo la dirección.
 */
function pickCategoryName(raw: unknown, locale: AppLocale): string {
  if (!raw) return '';
  const cat = raw as Partial<LocalizedText>;
  const normalized: LocalizedText = {
    es: cat.es ?? '',
    ca: cat.ca ?? '',
    en: cat.en,
    de: cat.de,
  };
  return pickLocalized(normalized, locale);
}

/**
 * Mapea una fila pendiente cruda al shape `AdminVerificationRequest`
 * que consume la UI sin cambios.
 */
function mapPendingRow(
  row: {
    id: string;
    businessName: string;
    type: 'autonomo' | 'centro';
    vatNumber: string | null;
    description: unknown;
    address: string;
    createdAt: Date;
    ownerEmail: string;
    categoryName: unknown;
  },
  locale: AppLocale,
): AdminVerificationRequest {
  const documents: VerificationDocument[] = [];
  return {
    id: row.id,
    status: 'pending',
    submittedAt: row.createdAt,
    providerName: row.businessName,
    providerType: row.type,
    providerCity: row.address,
    providerCategory: pickCategoryName(row.categoryName, locale),
    contactEmail: row.ownerEmail,
    contactPhone: '',
    vatNumber: row.vatNumber ?? '',
    description: pickDescription(row.description, locale),
    documents,
  };
}

/**
 * Devuelve los providers pendientes de verificación, listos para la
 * cola admin (`/admin`). Ya vienen ordenados por `createdAt` desc en
 * el repositorio.
 */
export async function listPendingVerifications(
  locale: AppLocale,
): Promise<AdminVerificationRequest[]> {
  const rows = await verificationRepository.findPendingProviders();
  return rows.map((row) => mapPendingRow(row, locale));
}

/**
 * Devuelve la ficha completa de un provider para la pantalla de
 * detalle (`/admin/verificaciones/[id]`). Devuelve `null` si no existe
 * (en lugar de lanzar) para que la página responda con 404 limpio.
 *
 * Incluye providers en cualquier estado (pending/approved/rejected),
 * no solo pending — el admin puede querer revisar una decisión pasada.
 */
export async function getVerificationDetail(
  providerId: string,
  locale: AppLocale,
): Promise<AdminVerificationRequest | null> {
  const row = await verificationRepository.findProviderForVerification(providerId);
  if (!row) return null;
  // El estado real lo leemos desde Provider — pero el repositorio sólo
  // devuelve los datos identificativos, no el status. Por simplicidad
  // mapeamos como 'pending' aquí; la pantalla de detalle muestra el
  // mismo bloque para los tres estados y la decisión se aplica vía
  // server action que vuelve a leer el status fresco. Si más adelante
  // necesitamos distinguir el badge "ya aprobado/rechazado" en el
  // detalle, ampliamos la fila con `verificationStatus`.
  return mapPendingRow(row, locale);
}

/**
 * Aprueba un provider (cambia `verificationStatus` a `approved` y
 * registra la decisión en `verification_requests`).
 *
 * @throws ProviderNotFoundForVerificationError — si el provider no existe.
 * @throws InvalidVerificationStatusError — si Zod rechaza el input.
 */
export async function approveProvider(input: unknown, reviewedBy: string): Promise<void> {
  let data: { providerId: string; notes?: string };
  try {
    data = approveProviderSchema.parse(input);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new InvalidVerificationStatusError(err.issues[0]?.message);
    }
    throw err;
  }

  // Verificamos existencia antes del update para mapear a un error
  // claro en vez de un Prisma "Record not found" genérico.
  const exists = await verificationRepository.findProviderForVerification(data.providerId);
  if (!exists) {
    throw new ProviderNotFoundForVerificationError();
  }

  await verificationRepository.setVerificationDecision({
    providerId: data.providerId,
    status: 'approved',
    reviewedBy,
    notes: data.notes ?? null,
  });
}

/**
 * Rechaza un provider con motivo obligatorio (>=5 caracteres).
 *
 * @throws ProviderNotFoundForVerificationError — si el provider no existe.
 * @throws RejectionNotesRequiredError — si las notas no superan validación.
 */
export async function rejectProvider(input: unknown, reviewedBy: string): Promise<void> {
  let data: { providerId: string; notes: string };
  try {
    data = rejectProviderSchema.parse(input);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new RejectionNotesRequiredError(err.issues[0]?.message);
    }
    throw err;
  }

  const exists = await verificationRepository.findProviderForVerification(data.providerId);
  if (!exists) {
    throw new ProviderNotFoundForVerificationError();
  }

  await verificationRepository.setVerificationDecision({
    providerId: data.providerId,
    status: 'rejected',
    reviewedBy,
    notes: data.notes,
  });
}

/**
 * Cuentas de providers por estado de verificación, para el dashboard.
 * Solo reexporta — la lógica vive en el repositorio.
 */
export async function countProvidersByVerificationStatus() {
  return verificationRepository.countByVerificationStatus();
}
