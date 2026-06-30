import 'server-only';

/**
 * Repositorio del wizard de onboarding del proveedor (#57).
 *
 * Capa fina sobre Prisma: solo lectura/escritura, ninguna regla de
 * negocio. Las reglas (ownership, plan free obligatorio, ramas según
 * tipo de proveedor) viven en `provider-onboarding.service.ts`.
 *
 * Particularidades:
 *  - `insertProviderWithLocation` usa raw SQL porque la columna
 *    `location` es PostGIS `Unsupported` en Prisma. Patrón calcado
 *    de `prisma/seed-dev.ts` para mantener una sola forma de hacerlo.
 *  - `ON CONFLICT (slug) DO NOTHING` resuelve la carrera con otro
 *    proveedor que acabe de coger el mismo slug: si no insertamos
 *    nada, devolvemos null y el service lanza `SlugAlreadyTakenError`.
 *  - Los mapeos de enums visibles (`€`, `€€`, `€€€`) al enum Prisma
 *    (`euro`, `euro2`, `euro3`) viven en este módulo. El service
 *    trabaja con los símbolos.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import type {
  BusinessType,
  OnboardingState,
  PlanTierChoice,
  PriceRangeChoice,
} from './provider-onboarding.types';

// ============================================================================
// Helpers internos
// ============================================================================

/**
 * Mapea el símbolo de precio al valor del enum `PriceRange` en BD.
 * Los `@map("€")` del schema imponen que Prisma persista los símbolos
 * literales, así que en raw SQL podemos pasar directamente el símbolo.
 */
const priceRangeMap: Record<PriceRangeChoice, '€' | '€€' | '€€€'> = {
  '€': '€',
  '€€': '€€',
  '€€€': '€€€',
};

/**
 * Devuelve el `verificationStatus` con el que se persiste un Provider
 * recién creado por el wizard.
 *
 * Hasta que tengamos panel admin real con cola de verificación
 * (TODO Fase 1), auto-aprobamos en `dev`/`preview` para que el dueño
 * vea su local en `/buscar` y en el autocomplete inmediatamente. En
 * producción dejamos `pending` para que un alta no entre directa al
 * marketplace sin revisión humana — incluso aunque no haya quien
 * apruebe todavía, es preferible a publicar negocios sin filtro.
 *
 * Detección: usamos `VERCEL_ENV` (no `NODE_ENV`) porque Vercel pone
 * `NODE_ENV='production'` también en preview deployments — sólo
 * `VERCEL_ENV === 'production'` es el entorno público real.
 */
function getDefaultVerificationStatus(): 'pending' | 'approved' {
  return process.env.VERCEL_ENV === 'production' ? 'pending' : 'approved';
}

/**
 * Plantilla de horario semanal por defecto que asignamos al
 * Professional inicial cuando el proveedor es autónomo. Coincide con
 * la convención del campo `Professional.schedule` (`{ monday: [...] }`).
 * El proveedor lo ajusta más adelante desde el panel.
 */
const DEFAULT_PROFESSIONAL_SCHEDULE = {
  monday: [{ open: '10:00', close: '20:00' }],
  tuesday: [{ open: '10:00', close: '20:00' }],
  wednesday: [{ open: '10:00', close: '20:00' }],
  thursday: [{ open: '10:00', close: '20:00' }],
  friday: [{ open: '10:00', close: '20:00' }],
  saturday: [] as Array<{ open: string; close: string }>,
  sunday: [] as Array<{ open: string; close: string }>,
} as const;

// ============================================================================
// Tipos internos del repo
// ============================================================================

export interface InsertProviderWithLocationArgs {
  userId: string;
  type: BusinessType;
  businessName: string;
  slug: string;
  description: Record<string, string | undefined>;
  address: string;
  location: { lat: number; lng: number };
  priceRange: PriceRangeChoice;
  planId: string;
}

export interface CreateProfessionalArgs {
  providerId: string;
  userId: string | null;
  name: string;
}

export interface CreateServiceArgs {
  providerId: string;
  categoryId: string;
  professionalId: string | null;
  name: Record<string, string | undefined>;
  description: Record<string, string | undefined>;
  durationMinutes: number;
  priceCents: number;
}

// ============================================================================
// Repositorio
// ============================================================================

export const providerOnboardingRepository = {
  /**
   * Inserta un Provider con su ubicación PostGIS via raw SQL.
   *
   * Devuelve `{ id }` si insertó, `null` si el slug ya existía
   * (`ON CONFLICT (slug) DO NOTHING`). Mantenemos el patrón de
   * `seed-dev.ts` para que cualquier cambio en el set de columnas se
   * propague de forma obvia.
   */
  async insertProviderWithLocation(
    args: InsertProviderWithLocationArgs,
  ): Promise<{ id: string } | null> {
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `
      INSERT INTO providers (
        id, "userId", type, "businessName", slug, description, address,
        location, photos, "priceRange", "ratingAvg", "ratingCount",
        "planId", "verificationStatus", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2::"ProviderType", $3, $4, $5::jsonb, $6,
        ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography,
        ARRAY[]::text[], $9::"PriceRange", 0, 0,
        $10, $11::"VerificationStatus", NOW(), NOW()
      )
      ON CONFLICT (slug) DO NOTHING
      RETURNING id;
      `,
      args.userId,
      args.type,
      args.businessName,
      args.slug,
      JSON.stringify(args.description),
      args.address,
      args.location.lng,
      args.location.lat,
      priceRangeMap[args.priceRange],
      args.planId,
      getDefaultVerificationStatus(),
    );
    return rows[0] ?? null;
  },

  /**
   * Localiza el primer Provider vivo de un usuario. Lo usa el service
   * para impedir crear un segundo Provider vía este flujo (multi-centro
   * va por otro camino) y para resolver ownership en los pasos 3-5.
   */
  async findProviderByOwner(userId: string): Promise<{ id: string; planId: string } | null> {
    return prisma.provider.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true, planId: true },
    });
  },

  /**
   * Lookup binario para el endpoint de slug-availability del wizard.
   * Devuelve true si el slug ya está cogido por cualquier proveedor
   * (también soft-deleted: el UNIQUE en BD no distingue).
   */
  async slugExists(slug: string): Promise<boolean> {
    const row = await prisma.provider.findUnique({
      where: { slug },
      select: { id: true },
    });
    return Boolean(row);
  },

  /** Actualiza la galería de fotos del Provider. */
  async updatePhotos(providerId: string, photos: string[]): Promise<void> {
    await prisma.provider.update({
      where: { id: providerId },
      data: { photos },
    });
  },

  /**
   * Crea el Professional asociado a un Provider.
   *
   * Para proveedores `autonomo` el service llama con `userId === ownerUserId`
   * para que el dueño aparezca como profesional. Para `centro` no se
   * crea Professional inicial — el centro los da de alta luego desde
   * el panel.
   */
  async createProfessional(args: CreateProfessionalArgs): Promise<{ id: string }> {
    const row = await prisma.professional.create({
      data: {
        providerId: args.providerId,
        userId: args.userId,
        name: args.name,
        // El cast preserva la forma literal sin arrastrar tipos generados
        // de Prisma para JsonValue al borde del repositorio.
        schedule: DEFAULT_PROFESSIONAL_SCHEDULE as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return row;
  },

  /**
   * Localiza el Professional inicial de un Provider tipo autónomo.
   * El service lo usa para heredar `professionalId` al primer servicio.
   * Si por cualquier motivo hay varios (no debería en onboarding),
   * devolvemos el más antiguo para coger al titular.
   */
  async findFirstProfessional(providerId: string): Promise<{ id: string } | null> {
    return prisma.professional.findFirst({
      where: { providerId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
  },

  /** Crea un Service del catálogo del proveedor. */
  async createService(args: CreateServiceArgs): Promise<{ id: string }> {
    const row = await prisma.service.create({
      data: {
        providerId: args.providerId,
        categoryId: args.categoryId,
        professionalId: args.professionalId,
        name: args.name as unknown as Prisma.InputJsonValue,
        description: args.description as unknown as Prisma.InputJsonValue,
        durationMinutes: args.durationMinutes,
        priceCents: args.priceCents,
      },
      select: { id: true },
    });
    return row;
  },

  /** Cambia el plan del Provider. Stripe Billing es #61, aquí solo BD. */
  async updatePlan(providerId: string, planId: string): Promise<void> {
    await prisma.provider.update({
      where: { id: providerId },
      data: { planId },
    });
  },

  /** Resuelve el `id` del plan por su tier. */
  async findPlanByTier(tier: PlanTierChoice): Promise<{ id: string } | null> {
    return prisma.plan.findUnique({
      where: { tier },
      select: { id: true },
    });
  },

  /** Comprueba que una categoría existe — usado en el paso 4. */
  async findCategoryById(id: string): Promise<{ id: string } | null> {
    return prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
  },

  /**
   * Construye el estado del onboarding para hidratar el wizard al
   * regresar. Una sola query agregada por tabla, sin N+1:
   *  - existencia de Provider + planId + tier (join Plan).
   *  - número de fotos (length del array).
   *  - número de servicios activos.
   */
  async getOnboardingState(userId: string): Promise<OnboardingState> {
    const provider = await prisma.provider.findFirst({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        photos: true,
        plan: { select: { tier: true } },
        _count: {
          select: {
            services: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!provider) {
      return {
        providerId: null,
        step: 1,
        hasPhotos: false,
        hasFirstService: false,
        planTier: null,
      };
    }

    const hasPhotos = provider.photos.length > 0;
    const hasFirstService = provider._count.services > 0;
    const planTier = provider.plan.tier;

    // Calculamos el siguiente paso pendiente. Si el proveedor solo
    // tiene Provider creado, le toca subir fotos (paso 3). Si tiene
    // fotos, le toca crear servicio (paso 4). Si tiene servicio, le
    // toca elegir plan (paso 5). Si todo cuadra y ya hay plan, el
    // wizard está completado.
    let step: OnboardingState['step'];
    if (!hasPhotos) {
      step = 3;
    } else if (!hasFirstService) {
      step = 4;
    } else {
      // Aunque el provider arranca con planId=free, distinguimos el
      // paso 5 como "elegir plan" solo cuando aún no tomó decisión
      // explícita. Como no hay flag de "ha confirmado plan", marcamos
      // completado en cuanto tiene servicio.
      step = 'completed';
    }

    return {
      providerId: provider.id,
      step,
      hasPhotos,
      hasFirstService,
      planTier,
    };
  },
};
