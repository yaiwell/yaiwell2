import type { DeletedObjectJSON, UserJSON } from '@clerk/backend';
import type { Locale, UserRole } from '@prisma/client';

import { MissingPrimaryEmailError, UserNotFoundError } from './user.errors';
import { userRepository } from './user.repository';
import type { ClerkUserSyncInput } from './user.types';

/**
 * Roles válidos en Yaiwell. Espejo de `UserRole` del enum de Prisma.
 * Se duplica como `const` para poder hacer `includes()` con narrowing.
 */
const VALID_ROLES = ['client', 'provider', 'admin'] as const satisfies readonly UserRole[];

/**
 * Locales soportados en MVP. Espejo del enum `Locale` de Prisma.
 */
const VALID_LOCALES = ['es', 'ca'] as const satisfies readonly Locale[];

/**
 * Sincroniza un evento `user.created` o `user.updated` de Clerk con la
 * tabla `users` de Supabase.
 *
 * Normaliza:
 * - **email**: el primario por `primary_email_address_id`. Si Clerk no
 *   resuelve un primario válido lanzamos `MissingPrimaryEmailError`
 *   — el caller decide si devuelve 200 (ignora) o 400 al webhook.
 * - **rol**: lee `publicMetadata.role` primero (backend), cae a
 *   `unsafeMetadata.role` (el cliente lo escribe en el sign-up) y al
 *   default `'client'` si nada es válido. Capa 3 promoverá unsafe→public
 *   automáticamente, pero hasta entonces respetamos el unsafe.
 * - **locale**: lee `unsafeMetadata.locale` (lo escribimos en sign-up
 *   con el locale activo). Default `'es'`.
 * - **fullName**: `first_name + last_name`, trimmed, null si vacío.
 * - **avatarUrl**: `image_url`, null si está vacío o es el placeholder.
 *
 * @returns el row de `users` tras el upsert.
 */
export async function syncUserFromClerk(payload: UserJSON) {
  const input = normalizeClerkUser(payload);
  return userRepository.upsertByClerkId(input);
}

/**
 * Procesa un evento `user.deleted` de Clerk.
 *
 * Hace soft delete (`deletedAt = now`) para no romper las FKs de
 * `bookings` y `reviews`. Es idempotente: si no encuentra el usuario
 * (race con `user.created` perdido) lanza `UserNotFoundError` y el
 * caller decide loguear y devolver 200 al webhook para que Clerk no
 * reintente eternamente.
 */
export async function deleteUserFromClerk(payload: DeletedObjectJSON) {
  if (!payload.id) {
    throw new UserNotFoundError('El evento user.deleted no incluye id.');
  }
  const deleted = await userRepository.softDeleteByClerkId(payload.id);
  if (!deleted) {
    throw new UserNotFoundError();
  }
  return deleted;
}

/**
 * Extrae los campos canónicos de un `UserJSON` de Clerk.
 *
 * Exportada para tests; el route handler debe usar `syncUserFromClerk`.
 */
export function normalizeClerkUser(payload: UserJSON): ClerkUserSyncInput {
  const email = resolvePrimaryEmail(payload);
  if (!email) {
    throw new MissingPrimaryEmailError();
  }

  return {
    clerkId: payload.id,
    email,
    role: resolveRole(payload),
    locale: resolveLocale(payload),
    fullName: resolveFullName(payload),
    avatarUrl: resolveAvatarUrl(payload),
  };
}

/**
 * Devuelve la dirección de email primaria (la marcada por Clerk como
 * `primary_email_address_id`). Si no hay match, cae al primer email
 * verificado, y si tampoco, al primero del array. Devuelve null si
 * el array está vacío.
 */
function resolvePrimaryEmail(payload: UserJSON): string | null {
  const emails = payload.email_addresses ?? [];
  if (emails.length === 0) return null;
  const primary = emails.find((e) => e.id === payload.primary_email_address_id);
  if (primary?.email_address) return primary.email_address;
  const verified = emails.find((e) => e.verification?.status === 'verified');
  if (verified?.email_address) return verified.email_address;
  return emails[0]?.email_address ?? null;
}

/**
 * Resuelve el rol con la cadena `publicMetadata.role` →
 * `unsafeMetadata.role` → `'client'`. Solo acepta valores del enum
 * de Prisma; cualquier otro string se ignora como si no estuviera.
 */
function resolveRole(payload: UserJSON): UserRole {
  const fromPublic = payload.public_metadata?.role;
  if (isValidRole(fromPublic)) return fromPublic;
  const fromUnsafe = payload.unsafe_metadata?.role;
  if (isValidRole(fromUnsafe)) return fromUnsafe;
  return 'client';
}

function isValidRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value);
}

/**
 * Resuelve el locale del usuario. Solo aceptamos `es` y `ca` (los del
 * enum). Cualquier otro valor (ej. `en` que aún no soportamos) cae al
 * default `'es'`.
 */
function resolveLocale(payload: UserJSON): Locale {
  const fromUnsafe = payload.unsafe_metadata?.locale;
  if (typeof fromUnsafe === 'string' && (VALID_LOCALES as readonly string[]).includes(fromUnsafe)) {
    return fromUnsafe as Locale;
  }
  return 'es';
}

/**
 * Compone el nombre completo a partir de `first_name + last_name` de
 * Clerk. Devuelve null si ambos están vacíos para no guardar strings
 * vacíos en BD.
 */
function resolveFullName(payload: UserJSON): string | null {
  const first = payload.first_name?.trim() ?? '';
  const last = payload.last_name?.trim() ?? '';
  const composed = [first, last].filter(Boolean).join(' ').trim();
  return composed.length > 0 ? composed : null;
}

/**
 * Resuelve la URL del avatar. Clerk siempre devuelve un `image_url`
 * (genera un placeholder si el usuario no subió foto), pero filtramos
 * el caso vacío por defensa.
 */
function resolveAvatarUrl(payload: UserJSON): string | null {
  const url = payload.image_url?.trim();
  return url && url.length > 0 ? url : null;
}
