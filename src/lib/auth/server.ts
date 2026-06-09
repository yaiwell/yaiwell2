import 'server-only';

/**
 * API pública del módulo de autenticación — **solo servidor**.
 *
 * Re-exporta los símbolos que tocan `@clerk/nextjs/server` (currentUser,
 * clerkClient) y por tanto no pueden importarse desde un Client Component.
 *
 * El marker `import 'server-only'` hace que Webpack rompa el build con
 * un mensaje claro si algún Client Component importa por error desde
 * este barrel — en lugar de descubrirlo a través de un import trace
 * críptico de Clerk.
 *
 * Consumidores típicos: layouts protegidos por rol, webhooks, server
 * actions que necesitan el usuario actual.
 */

export { requireRole } from './guard';
export type { GuardResult } from './guard';
export { promoteRoleToPublicMetadata } from './promoteRole';
