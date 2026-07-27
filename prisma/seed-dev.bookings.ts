/**
 * Seed de desarrollo — reservas sintéticas.
 *
 * Sirven para que en `/buscar` no salgan todos los proveedores en verde:
 * ocupamos a propósito las próximas horas de algunos providers para ver
 * también el estado ámbar (hueco más tarde hoy) y el gris (sin huecos).
 *
 * IMPORTANTE: todas las fechas se calculan **en tiempo de ejecución del
 * seed**, relativas a `Date.now()`. Con fechas fijas el seed caducaría en
 * cuestión de días: las reservas quedarían en el pasado, el motor de
 * availability las ignoraría y volveríamos a ver todo verde sin que nadie
 * se diese cuenta de que el dataset había dejado de ser representativo.
 *
 * Idempotencia: las reservas no tienen clave natural, así que borramos
 * todas las del cliente sintético antes de recrearlas. Ese borrado debe
 * ocurrir ANTES del reset de services (FK `Restrict` de Booking→Service).
 */

import { BookingStatus, Locale, type PrismaClient, UserRole } from '@prisma/client';

import { fakeProviders } from '../src/lib/fake-data/providers';

// ============================================================================
// Constantes
// ============================================================================

/**
 * Cliente sintético dueño de todas las reservas del seed. No corresponde
 * a una sesión Clerk real; solo cumple la FK `Booking.clientId → users.id`
 * y nos da una forma trivial de localizar (y borrar) lo que sembramos.
 */
const SEED_DEV_CLIENT_CLERK_ID = 'seed_dev_client';
const SEED_DEV_CLIENT_EMAIL = 'dev-client@yaiwell.local';

/**
 * Comisión aplicada a las reservas sintéticas: 12% (1200 bps), el
 * `commissionRateBps` del plan free que siembra `seed.ts`. Lo replicamos
 * aquí en vez de leerlo de BD porque el dato solo tiene valor decorativo
 * en dev y no queremos acoplar el seed al catálogo de planes.
 */
const SEED_COMMISSION_BPS = 1200;

/** Duración de cada reserva sintética. Bloques largos = menos filas. */
const BLOCK_MINUTES = 120;

/**
 * Cuántas horas a partir de "ahora" queda ocupado cada provider.
 *
 * - 2h → el provider pierde el hueco inmediato pero conserva huecos más
 *   tarde: es el caso ámbar.
 * - 12h → cubre el resto de la jornada: caso gris (solo quedará hueco
 *   mañana).
 * El resto de providers se dejan libres a propósito para el caso verde.
 */
const BUSY_PROVIDERS_BY_SLUG: Record<string, number> = {
  'atelier-norte': 2,
  'born-padel-club': 2,
  'casa-mar-massatges': 4,
  'spa-sarria': 12,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Redondea el instante actual a la siguiente media hora en punto.
 * Las reservas reales caen en horas "limpias"; imitarlo hace que los
 * bloques sintéticos solapen de verdad con los slots que genera el motor.
 */
function nextHalfHour(now: Date): Date {
  const rounded = new Date(now.getTime());
  rounded.setSeconds(0, 0);
  rounded.setMinutes(rounded.getMinutes() < 30 ? 30 : 60);
  return rounded;
}

/** Comisión de plataforma en céntimos a partir del precio del servicio. */
function commissionFor(priceCents: number): number {
  return Math.round((priceCents * SEED_COMMISSION_BPS) / 10_000);
}

// ============================================================================
// API del módulo
// ============================================================================

/**
 * Crea (o recupera) el usuario cliente sintético del seed.
 */
export async function upsertSyntheticClient(prisma: PrismaClient): Promise<{ id: string }> {
  return prisma.user.upsert({
    where: { clerkId: SEED_DEV_CLIENT_CLERK_ID },
    create: {
      clerkId: SEED_DEV_CLIENT_CLERK_ID,
      email: SEED_DEV_CLIENT_EMAIL,
      role: UserRole.client,
      locale: Locale.es,
      fullName: 'Seed Dev Client',
    },
    update: {},
    select: { id: true },
  });
}

/**
 * Borra las reservas sintéticas previas. Debe invocarse antes de resetear
 * los services, porque `Booking.serviceId` es `onDelete: Restrict`.
 *
 * @returns número de reservas borradas.
 */
export async function deleteSyntheticBookings(
  prisma: PrismaClient,
  clientId: string,
): Promise<number> {
  const { count } = await prisma.booking.deleteMany({ where: { clientId } });
  return count;
}

/**
 * Siembra reservas `confirmed` que ocupan las próximas horas de los
 * providers listados en `BUSY_PROVIDERS_BY_SLUG`.
 *
 * @param prisma — cliente ya conectado del seed principal.
 * @param args.clientId — id del cliente sintético.
 * @param args.providerIdMap — Map<fakeProviderId, dbProviderUuid>.
 * @param args.professionalIdMap — Map<fakeProviderId, dbProfessionalUuid>.
 * @returns número de reservas creadas.
 */
export async function seedSyntheticBookings(
  prisma: PrismaClient,
  args: {
    clientId: string;
    providerIdMap: Map<string, string>;
    professionalIdMap: Map<string, string>;
  },
): Promise<number> {
  const now = new Date();
  const firstStart = nextHalfHour(now);
  let created = 0;

  for (const [slug, busyHours] of Object.entries(BUSY_PROVIDERS_BY_SLUG)) {
    const fake = fakeProviders.find((p) => p.slug === slug);
    if (!fake) continue;

    const providerId = args.providerIdMap.get(fake.id);
    const professionalId = args.professionalIdMap.get(fake.id);
    if (!providerId || !professionalId) continue;

    // Cualquier servicio activo del provider sirve como referencia: la
    // reserva sintética solo necesita una FK válida y un precio.
    const service = await prisma.service.findFirst({
      where: { providerId, deletedAt: null, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, priceCents: true },
    });
    if (!service) continue;

    const blocks = Math.ceil((busyHours * 60) / BLOCK_MINUTES);
    for (let i = 0; i < blocks; i++) {
      const startAt = new Date(firstStart.getTime() + i * BLOCK_MINUTES * 60_000);
      const endAt = new Date(startAt.getTime() + BLOCK_MINUTES * 60_000);
      await prisma.booking.create({
        data: {
          clientId: args.clientId,
          serviceId: service.id,
          professionalId,
          providerId,
          startAt,
          endAt,
          status: BookingStatus.confirmed,
          priceCents: service.priceCents,
          commissionCents: commissionFor(service.priceCents),
        },
      });
      created++;
    }
  }

  return created;
}
