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
 * **Inicialización perezosa**: el cliente real se construye al primer
 * acceso (vía Proxy), no al cargar el módulo. Esto es lo que permite
 * que `next build` recolecte page-data de rutas que importan este módulo
 * sin tener `DATABASE_URL` disponible — la env solo es obligatoria en
 * runtime, cuando una request real golpea la BD. Si construyésemos
 * eagerly, el build de Vercel reventaría al evaluar el top-level de
 * cualquier route handler que importe `prisma`.
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

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Proxy que difiere la construcción al primer uso real. Importar el
// módulo no toca `DATABASE_URL`; solo `prisma.something.findX(...)` lo
// hace. Los métodos los rebindeamos al cliente real para preservar
// `this` en llamadas como `prisma.$transaction(...)`.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
}) as PrismaClient;
