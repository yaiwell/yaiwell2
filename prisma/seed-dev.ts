/**
 * Seed de desarrollo: providers + services fake para smoke E2E.
 *
 * Separado de `seed.ts` (que sólo siembra catálogo: planes + categorías)
 * porque estos datos solo tienen sentido en BD de desarrollo — no en
 * producción donde los providers reales se dan de alta vía panel.
 *
 * Reutiliza `src/lib/fake-data/{providers,services}.ts` para no duplicar
 * datos: si la UI fake muestra "Atelier Norte", la BD dev también, con
 * los mismos slugs/precios/coords. Permite probar el motor de búsqueda
 * contra Postgres real con datos coherentes.
 *
 * Además siembra 1 `Professional` por provider (con horarios variados) y
 * unas reservas sintéticas, para que el listado público pueda pintar
 * disponibilidad real. Este archivo queda como orquestador; el detalle
 * vive en `seed-dev.{professionals,services,bookings}.ts` para no pasar
 * de ~250 líneas por archivo.
 *
 * Idempotente:
 *  - User dueño (`clerkId = SEED_DEV_OWNER_CLERK_ID`) → upsert.
 *  - Providers → INSERT ... ON CONFLICT (slug) DO UPDATE (raw SQL porque
 *    `location` es PostGIS Unsupported).
 *  - Professionals → update del profesional vivo más antiguo del provider,
 *    o create si no hay ninguno (no hay clave natural).
 *  - Bookings sintéticos → DELETE WHERE clientId = cliente de seed +
 *    INSERT relativo a "ahora".
 *  - Services → DELETE WHERE providerId IN (gestionados) + INSERT. Más
 *    simple que upsert porque services no tienen slug natural y crear
 *    una clave compuesta solo para esto no aporta.
 *
 * Ejecución:
 *   npm run db:seed:dev
 *
 * Requiere que `seed.ts` haya corrido antes (categorías + planes).
 */

/* eslint-disable no-console -- script de CLI: logs en stdout son la salida esperada. */

import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Locale, PlanTier, PrismaClient, ProviderType, UserRole } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

import { fakeCategories } from '../src/lib/fake-data/categories';
import { fakeProviders } from '../src/lib/fake-data/providers';

import {
  deleteSyntheticBookings,
  seedSyntheticBookings,
  upsertSyntheticClient,
} from './seed-dev.bookings';
import { upsertProfessionals } from './seed-dev.professionals';
import { seedServices } from './seed-dev.services';

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida. Revisa .env.local.');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ============================================================================
// Constantes
// ============================================================================

/**
 * ClerkId sintético para el dueño de todos los providers de seed-dev.
 * No corresponde a una sesión Clerk real — es un placeholder que cumple
 * la FK `Provider.userId → users.id` sin acoplar el seed a Clerk dev.
 */
const SEED_DEV_OWNER_CLERK_ID = 'seed_dev_owner';
const SEED_DEV_OWNER_EMAIL = 'dev-owner@yaiwell.local';

// ============================================================================
// Helpers
// ============================================================================

const providerTypeMap: Record<string, ProviderType> = {
  autonomo: ProviderType.autonomo,
  centro: ProviderType.centro,
};

async function upsertDevOwner() {
  console.log('→ Upsert dev owner...');
  const user = await prisma.user.upsert({
    where: { clerkId: SEED_DEV_OWNER_CLERK_ID },
    create: {
      clerkId: SEED_DEV_OWNER_CLERK_ID,
      email: SEED_DEV_OWNER_EMAIL,
      role: UserRole.provider,
      locale: Locale.es,
      fullName: 'Seed Dev Owner',
    },
    // Sin update: si el row ya existe lo dejamos tal cual.
    update: {},
  });
  console.log(`  ✓ user.id=${user.id}`);
  return user;
}

async function getFreePlan() {
  // El plan free debe existir tras `npm run db:seed` (seed.ts).
  return prisma.plan.findFirstOrThrow({ where: { tier: PlanTier.free } });
}

/**
 * Mapea fakeCategoryId → dbUuid. Las categorías ya están en BD por slug
 * (seed.ts), así que resolvemos buscando por slug del fakeData.
 */
async function buildCategoryIdMap() {
  const all = await prisma.category.findMany({ select: { id: true, slug: true } });
  const dbBySlug = new Map(all.map((c) => [c.slug, c.id]));
  const map = new Map<string, string>();
  for (const fake of fakeCategories) {
    const dbId = dbBySlug.get(fake.slug);
    if (dbId) map.set(fake.id, dbId);
  }
  const missing = fakeCategories.filter((c) => !dbBySlug.has(c.slug));
  if (missing.length > 0) {
    console.warn(`  ⚠ ${missing.length} categorías fake sin match en BD por slug:`);
    for (const m of missing) console.warn(`    - ${m.slug}`);
  }
  console.log(`  ✓ ${map.size}/${fakeCategories.length} categorías mapeadas`);
  return map;
}

async function upsertProviders(userId: string, planId: string) {
  console.log('→ Upsert providers...');
  for (const fp of fakeProviders) {
    // Raw SQL porque `location` es PostGIS Unsupported en Prisma.
    // ON CONFLICT (slug) DO UPDATE para idempotencia. Marcamos siempre
    // `approved` para que aparezcan en `searchProviders` (que filtra).
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO providers (
        id, "userId", type, "businessName", slug, description, address,
        location, photos, "priceRange", "ratingAvg", "ratingCount",
        "planId", "verificationStatus", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2::"ProviderType", $3, $4, $5::jsonb, $6,
        ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography,
        $9::text[], $10::"PriceRange", $11, $12,
        $13, 'approved'::"VerificationStatus", NOW(), NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        "businessName" = EXCLUDED."businessName",
        description = EXCLUDED.description,
        address = EXCLUDED.address,
        location = EXCLUDED.location,
        photos = EXCLUDED.photos,
        "priceRange" = EXCLUDED."priceRange",
        "ratingAvg" = EXCLUDED."ratingAvg",
        "ratingCount" = EXCLUDED."ratingCount",
        "verificationStatus" = 'approved'::"VerificationStatus",
        "updatedAt" = NOW();
      `,
      userId,
      providerTypeMap[fp.type],
      fp.name,
      fp.slug,
      JSON.stringify(fp.description),
      fp.address,
      fp.location.lng,
      fp.location.lat,
      fp.photos,
      fp.priceRange,
      fp.rating,
      fp.reviewsCount,
      planId,
    );
  }
  console.log(`  ✓ ${fakeProviders.length} providers`);
}

/**
 * Devuelve un Map<fakeProviderId, dbProviderUuid>.
 */
async function buildProviderIdMap() {
  const slugs = fakeProviders.map((p) => p.slug);
  const rows = await prisma.provider.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const dbBySlug = new Map(rows.map((r) => [r.slug, r.id]));
  const map = new Map<string, string>();
  for (const fp of fakeProviders) {
    const id = dbBySlug.get(fp.slug);
    if (id) map.set(fp.id, id);
  }
  return map;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('=== seed-dev: providers + services + disponibilidad ===');
  const owner = await upsertDevOwner();
  const plan = await getFreePlan();
  const categoryIdMap = await buildCategoryIdMap();
  await upsertProviders(owner.id, plan.id);
  const providerIdMap = await buildProviderIdMap();

  // Orden obligatorio: primero fuera las reservas sintéticas previas
  // (FK Restrict Booking→Service), luego profesionales, luego services
  // (que ya pueden apuntar al profesional) y por último las reservas
  // nuevas, que necesitan services vivos a los que referirse.
  const client = await upsertSyntheticClient(prisma);
  const removedBookings = await deleteSyntheticBookings(prisma, client.id);
  console.log(`→ Borradas ${removedBookings} reservas sintéticas previas`);

  const professionalIdMap = await upsertProfessionals(prisma, providerIdMap);
  console.log(`→ ${professionalIdMap.size} profesionales con horario`);

  await seedServices(prisma, providerIdMap, categoryIdMap, professionalIdMap);

  const createdBookings = await seedSyntheticBookings(prisma, {
    clientId: client.id,
    providerIdMap,
    professionalIdMap,
  });
  console.log(`→ ${createdBookings} reservas sintéticas confirmadas`);

  console.log('=== seed-dev done ===');
}

main()
  .catch((err) => {
    console.error('seed-dev fallo:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
