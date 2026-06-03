import { PrismaClient } from '@prisma/client';

/**
 * Singleton del cliente Prisma para toda la app.
 *
 * En Next.js cada hot reload crea un nuevo módulo y podría instanciar
 * un cliente nuevo, agotando el pool de conexiones. El truco habitual es
 * cachearlo en `globalThis` durante el desarrollo.
 *
 * Nota Prisma 7: el cliente todavía se puede instanciar sin adapter para
 * usarse solo a nivel de tipos / mocks (los servicios mockean este módulo
 * vía `vi.mock`). Cuando enchufemos Supabase real configuraremos un
 * `adapter` aquí (driver `pg` o adaptador edge) sin romper los imports.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
