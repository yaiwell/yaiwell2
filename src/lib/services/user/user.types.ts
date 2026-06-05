/**
 * Tipos del dominio de usuario sincronizado desde Clerk.
 *
 * Los payloads de Clerk vienen con un shape estable definido por la SDK
 * (`UserJSON` de `@clerk/backend`). Aquí trabajamos con un subconjunto
 * estrechado a los campos que Yaiwell guarda en la tabla `users`. El
 * objetivo es no acoplar el resto del código al tipo completo de Clerk
 * y poder cambiar de proveedor sin tocar todos los call sites.
 */

import type { UserRole, Locale } from '@prisma/client';

/**
 * Datos extraídos del evento `user.created` o `user.updated` de Clerk,
 * ya normalizados: email primario resuelto, rol resuelto con fallback,
 * locale por defecto si no viene en metadata.
 */
export interface ClerkUserSyncInput {
  clerkId: string;
  email: string;
  role: UserRole;
  locale: Locale;
  fullName: string | null;
  avatarUrl: string | null;
}

/** Tipos de eventos de webhook que sincronizamos. */
export type ClerkWebhookEventType = 'user.created' | 'user.updated' | 'user.deleted';
