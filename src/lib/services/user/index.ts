/**
 * API pública del módulo `user`.
 *
 * Solo se consume desde el webhook de Clerk en `/api/webhooks/clerk` y,
 * eventualmente, desde server actions del panel admin que necesiten
 * lookup por `clerkId`. Importar archivos internos del módulo está
 * prohibido por convención (§6.bis CLAUDE.md).
 */

export { deleteUserFromClerk, normalizeClerkUser, syncUserFromClerk } from './user.service';
export { userRepository } from './user.repository';
export { MissingPrimaryEmailError, UserNotFoundError } from './user.errors';
export type { ClerkUserSyncInput, ClerkWebhookEventType } from './user.types';
