import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Singleton del cliente Prisma para toda la app.
 *
 * En Next.js cada hot reload crea un nuevo módulo y podría instanciar
 * un cliente nuevo, agotando el pool de conexiones. El truco habitual es
 * cachearlo en `globalThis` durante el desarrollo.
 *
 * Prisma 7 exige un driver adapter. Usamos `@prisma/adapter-pg` (basado
 * en `node-postgres`) apuntado a la `DATABASE_URL` (Session pooler de
 * Supabase, port 5432). Cuando deployemos a Vercel migraremos al pooler
 * en transaction mode (port 6543) para reducir latencia en serverless.
 *
 * En tests los servicios mockean este módulo vía `vi.mock`, por lo que
 * el adapter real nunca se instancia bajo Vitest.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL no está definida.');
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
