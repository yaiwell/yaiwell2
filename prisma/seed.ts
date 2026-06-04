/**
 * Seed inicial de Yaiwell.
 *
 * Inserta dos conjuntos de datos no vinculados a usuarios reales:
 *
 * 1. **Planes de suscripción** (4 tiers: free, basic, pro, premium).
 *    Necesarios porque `Provider.planId` es obligatorio y la lógica de
 *    booking calcula `commissionCents` a partir de `Plan.commissionRateBps`.
 *
 * 2. **Categorías jerárquicas** (4 raíces + tipos + subtipos) con sus
 *    iconos Lucide. Necesarias para que `Service.categoryId` resuelva y
 *    el formulario de alta de servicio del panel proveedor tenga datos.
 *
 * Idempotencia: todos los upserts usan claves únicas (`tier` para Plan,
 * `slug` para Category). Se puede re-ejecutar sin duplicar.
 *
 * Ejecución:
 *   - Manual:  `npm run db:seed`
 *   - Auto:    `npx prisma migrate reset` (lo dispara via prisma.config.ts).
 */

/* eslint-disable no-console -- script de CLI: logs en stdout son la salida esperada. */

import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PlanTier } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

import { fakeCategories } from '../src/lib/fake-data/categories';

// El seed puede ejecutarse fuera del contexto de Next.js (donde
// `.env.local` no se carga automáticamente). Cargamos aquí también para
// que `DATABASE_URL` esté disponible al instanciar el adapter.
loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida. Revisa .env.local.');
}

// Prisma 7 exige un driver adapter. Para Postgres usamos `@prisma/adapter-pg`,
// que abre conexiones directas vía node-postgres (sin engine binario).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ============================================================================
// Planes
// ============================================================================

/**
 * Definición comercial de los 4 planes.
 *
 * - `commissionRateBps` es "basis points" (centésimas de punto porcentual):
 *   1200 = 12.00%, 600 = 6.00%. Permite cálculos exactos sin decimales.
 * - `monthlyPriceCents` es el precio bruto en céntimos de euro.
 * - `stripeProductId` / `stripePriceId` quedan en null hasta que cableemos
 *   Stripe Billing; se rellenarán via migración separada o admin manual.
 */
const plans = [
  {
    tier: PlanTier.free,
    name: 'Gratis',
    maxServices: 1,
    monthlyPriceCents: 0,
    commissionRateBps: 1200, // 12%
  },
  {
    tier: PlanTier.basic,
    name: 'Básico',
    maxServices: 10,
    monthlyPriceCents: 1900, // 19€
    commissionRateBps: 1000, // 10%
  },
  {
    tier: PlanTier.pro,
    name: 'Pro',
    maxServices: 50,
    monthlyPriceCents: 4900, // 49€
    commissionRateBps: 800, // 8%
  },
  {
    tier: PlanTier.premium,
    name: 'Premium',
    maxServices: 999,
    monthlyPriceCents: 9900, // 99€
    commissionRateBps: 600, // 6%
  },
] as const;

async function seedPlans() {
  console.log('→ Sembrando planes...');
  for (const p of plans) {
    await prisma.plan.upsert({
      where: { tier: p.tier },
      create: {
        tier: p.tier,
        name: p.name,
        maxServices: p.maxServices,
        monthlyPriceCents: p.monthlyPriceCents,
        commissionRateBps: p.commissionRateBps,
      },
      update: {
        name: p.name,
        maxServices: p.maxServices,
        monthlyPriceCents: p.monthlyPriceCents,
        commissionRateBps: p.commissionRateBps,
      },
    });
  }
  console.log(`  ✓ ${plans.length} planes`);
}

// ============================================================================
// Categorías
// ============================================================================

/**
 * Siembra las categorías en dos pasadas para respetar la self-relation:
 *
 * 1. Primero las raíces (parentId === null).
 * 2. Luego los hijos, que ya pueden resolver `parent` por slug.
 *
 * Mapeamos `parentId` (id del fake) → `slug` para tener el FK correcto
 * tras el upsert. Los UUIDs de BD son nuevos, los ids del fake-data se
 * descartan a propósito (no se persisten).
 */
async function seedCategories() {
  console.log('→ Sembrando categorías...');

  // Mapa fakeId → DB UUID, se rellena conforme upsertamos.
  const dbIdByFakeId = new Map<string, string>();

  // Helper: ordena categorías por profundidad (root primero) para que
  // cuando upsertamos un hijo, su padre ya esté en `dbIdByFakeId`.
  const sortedByDepth = (() => {
    const depth = (id: string): number => {
      const cat = fakeCategories.find((c) => c.id === id);
      if (!cat || cat.parentId === null) return 0;
      return 1 + depth(cat.parentId);
    };
    return [...fakeCategories].sort((a, b) => depth(a.id) - depth(b.id));
  })();

  for (const cat of sortedByDepth) {
    const parentDbId = cat.parentId ? (dbIdByFakeId.get(cat.parentId) ?? null) : null;

    // `LocalizedText` no expone index signature; lo serializamos a Json
    // plano para que case con `InputJsonObject` de Prisma.
    const nameJson = { es: cat.name.es, ca: cat.name.ca };

    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        name: nameJson,
        icon: cat.icon,
        parentId: parentDbId,
      },
      update: {
        name: nameJson,
        icon: cat.icon,
        parentId: parentDbId,
      },
    });

    dbIdByFakeId.set(cat.id, row.id);
  }

  console.log(`  ✓ ${sortedByDepth.length} categorías`);
}

// ============================================================================
// Entry point
// ============================================================================

async function main() {
  await seedPlans();
  await seedCategories();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✓ Seed completado.');
  })
  .catch(async (e) => {
    console.error('✗ Seed falló:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
