import path from 'node:path';

import { createClerkClient } from '@clerk/backend';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

/**
 * Helpers para gestionar el usuario provider de pruebas usado por los
 * E2E del wizard de onboarding.
 *
 * Convención: el usuario lo crea el dev una sola vez en el dashboard de
 * Clerk dev (ver `tests/e2e/README-onboarding.md`). Estos helpers se
 * encargan del estado runtime: promocionar el rol a `provider` y limpiar
 * la fila `Provider` (+ servicios) en Supabase entre tests para que el
 * wizard pueda recorrerse de cero cada vez.
 *
 * Carga de `.env.local`: Playwright corre `globalSetup` en un proceso
 * master separado de los workers donde viven los tests, así que las
 * variables que cargue allí NO se ven aquí. Cargamos `.env.local` en el
 * propio módulo (top-level, idempotente) para que `process.env` tenga
 * `DATABASE_URL`, `CLERK_SECRET_KEY` y `CLERK_TEST_PROVIDER_*` cuando
 * cualquiera de los helpers lo necesite.
 */

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

let prisma: PrismaClient | null = null;
let clerk: ReturnType<typeof createClerkClient> | null = null;

/** Lazy singletons para que los helpers no inicialicen clientes en import. */
function getPrisma(): PrismaClient {
  if (!prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL no está definida. ¿Cargaste .env.local?');
    }
    // Prisma 7 exige un driver adapter. Usamos `@prisma/adapter-pg`
    // igual que el runtime de la app (`src/lib/db/prisma.ts`).
    const adapter = new PrismaPg({ connectionString });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

function getClerk(): ReturnType<typeof createClerkClient> {
  if (!clerk) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY no está definida. ¿Cargaste .env.local?');
    }
    clerk = createClerkClient({ secretKey });
  }
  return clerk;
}

/** Lee el email del provider de pruebas desde env. */
function getTestEmail(): string {
  const email = process.env.CLERK_TEST_PROVIDER_EMAIL;
  if (!email) {
    throw new Error(
      'CLERK_TEST_PROVIDER_EMAIL no está definida en .env.local. ' +
        'Lee tests/e2e/README-onboarding.md para crear el usuario de pruebas.',
    );
  }
  return email;
}

/**
 * Localiza el usuario de pruebas en Clerk y devuelve su `clerkId`.
 * Lanza con instrucciones si el dev aún no lo creó en el dashboard.
 */
export async function getTestProviderClerkId(): Promise<string> {
  const email = getTestEmail();
  const users = await getClerk().users.getUserList({ emailAddress: [email] });
  const user = users.data[0];
  if (!user) {
    throw new Error(
      `No se encontró el usuario "${email}" en Clerk. ` +
        'Créalo desde el dashboard de Clerk dev (ver tests/e2e/README-onboarding.md).',
    );
  }
  return user.id;
}

/**
 * Garantiza que el usuario de pruebas tiene `publicMetadata.role = 'provider'`.
 * Si lo creaste manualmente en el dashboard, su `publicMetadata` está vacío
 * y `requireRole(['provider'])` te redirigiría fuera del wizard.
 */
export async function ensureTestProviderRole(): Promise<string> {
  const clerkId = await getTestProviderClerkId();
  const user = await getClerk().users.getUser(clerkId);
  const currentRole = (user.publicMetadata as { role?: string } | null)?.role;
  if (currentRole !== 'provider') {
    await getClerk().users.updateUserMetadata(clerkId, {
      publicMetadata: { ...user.publicMetadata, role: 'provider' },
    });
  }
  return clerkId;
}

/**
 * Garantiza el row `User` interno en Supabase para el user de pruebas.
 *
 * Cuando creas un user manualmente en el dashboard de Clerk dev, **no**
 * se dispara el webhook `user.created` que sincroniza el espejo en BD.
 * El wizard detecta la ausencia y se queda en pantalla "Sincronizando…"
 * infinitamente, porque el webhook que nunca llegará no va a crear el
 * row.
 *
 * Hacemos un upsert directo con los datos del user de Clerk, replicando
 * lo que el webhook real haría. Si llegara un día el webhook (cambias
 * de email en Clerk, p. ej.) sobreescribirá esto sin conflicto porque
 * la clave es `clerkId`.
 */
export async function ensureTestProviderInternalUser(): Promise<void> {
  const clerkId = await getTestProviderClerkId();
  const clerkUser = await getClerk().users.getUser(clerkId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error(`El user "${clerkId}" no tiene email en Clerk; no se puede sincronizar.`);
  }
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;

  const upserted = await getPrisma().user.upsert({
    where: { clerkId },
    create: {
      clerkId,
      email,
      role: 'provider',
      locale: 'es',
      fullName,
      avatarUrl: clerkUser.imageUrl || null,
    },
    update: {
      // Re-afirmamos los campos por si el dev cambió algo desde el
      // dashboard. El email es UNIQUE, así que si chocara aquí
      // sabríamos que hay duplicados manuales.
      email,
      role: 'provider',
      fullName,
      avatarUrl: clerkUser.imageUrl || null,
      // Resucitamos el row si quedó soft-deleted en runs anteriores.
      deletedAt: null,
    },
    select: { id: true, clerkId: true, role: true, deletedAt: true },
  });

  // Trazas mínimas para debugging cuando el wizard se queda en
  // "Sincronizando…": confirman que el row está en la BD que el
  // dev server está leyendo y con qué clerkId.
  // eslint-disable-next-line no-console
  console.log(
    `[e2e] User interno sembrado: id=${upserted.id} clerkId=${upserted.clerkId} role=${upserted.role}`,
  );
}

/**
 * Borra el `Provider` (con cascade a `Service` y demás) asociado al
 * usuario de pruebas. También elimina el row `User` interno para forzar
 * la pantalla "syncing…" si el webhook todavía no ha disparado — útil
 * para validar ese camino en otros tests.
 *
 * Si no hay nada que borrar, no-op silencioso.
 */
export async function cleanupTestProviderBD(): Promise<void> {
  const clerkId = await getTestProviderClerkId();
  const db = getPrisma();

  // Buscamos el espejo interno por clerkId. Si no existe, no hay nada
  // que limpiar — el webhook aún no ha llegado y el wizard arrancará
  // en pantalla "syncing…" la próxima vez.
  const internalUser = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!internalUser) return;

  // El cascade en el schema borra Service, Availability, etc. asociadas
  // a los Provider del usuario. `deleteMany` cubre múltiples Providers
  // si por algún motivo de testing acabaron coexistiendo.
  await db.provider.deleteMany({ where: { userId: internalUser.id } });
}

/**
 * Cierra el cliente de Prisma. Útil en `globalTeardown` para que el
 * proceso de Playwright no quede colgado esperando conexiones abiertas.
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
