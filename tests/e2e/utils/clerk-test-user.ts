import { createClerkClient } from '@clerk/backend';
import { PrismaClient } from '@prisma/client';

/**
 * Helpers para gestionar el usuario provider de pruebas usado por los
 * E2E del wizard de onboarding.
 *
 * Convención: el usuario lo crea el dev una sola vez en el dashboard de
 * Clerk dev (ver `tests/e2e/README-onboarding.md`). Estos helpers se
 * encargan del estado runtime: promocionar el rol a `provider` y limpiar
 * la fila `Provider` (+ servicios) en Supabase entre tests para que el
 * wizard pueda recorrerse de cero cada vez.
 */

let prisma: PrismaClient | null = null;
let clerk: ReturnType<typeof createClerkClient> | null = null;

/** Lazy singletons para que los helpers no inicialicen clientes en import. */
function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
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
