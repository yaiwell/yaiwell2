import 'server-only';

/**
 * Servicio del wizard de onboarding del proveedor (#57).
 *
 * Orquesta el repositorio con las reglas de negocio:
 *  - Estrategia Opción B confirmada (CLAUDE.md §3 / ADR de `auth/provider.ts`):
 *    el `Provider` se materializa al final del paso 2. Pasos 3-5 son
 *    updates idempotentes sobre el row existente.
 *  - El usuario solo puede tener un Provider vía este wizard. El alta de
 *    centros adicionales irá por otro flujo (multi-centro, Fase 1).
 *  - Todo Provider nace con un Professional inicial y horario por
 *    defecto. En `autonomo` es el propio dueño (`userId = ownerUserId`);
 *    en `centro` es un placeholder sin cuenta (`userId = null`) que el
 *    titular renombra o sustituye al dar de alta su equipo. Sin
 *    Professional no hay horario y el negocio nace invisible en el
 *    listado público (todo gris).
 *  - Ownership: todo update de los pasos 3-5 verifica que el Provider
 *    pertenece al usuario autenticado. Si no, lanzamos
 *    `ProviderForOnboardingNotFoundError` (sin distinguir not-found de
 *    forbidden, para no filtrar existencia de proveedores ajenos).
 *  - Stripe Billing es #61: aquí solo cambiamos `planId` en BD. El
 *    upgrade real (checkout de suscripción) lo dispara el caller.
 */

import {
  CategoryNotFoundError,
  FreePlanNotSeededError,
  OnboardingAlreadyCompleteError,
  PlanTierNotFoundError,
  ProviderForOnboardingNotFoundError,
  SlugAlreadyTakenError,
} from './provider-onboarding.errors';
import { providerOnboardingRepository } from './provider-onboarding.repository';
import type { OnboardingState } from './provider-onboarding.types';
import {
  createFirstServiceSchema,
  createProviderSchema,
  selectPlanSchema,
  updatePhotosSchema,
} from './provider-onboarding.validation';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Comprueba que el Provider existe y pertenece al usuario actual.
 * Devuelve el row mínimo si pasa, lanza si no. Lo usan los pasos 3-5.
 */
async function assertOwnership(providerId: string, ownerUserId: string) {
  const owner = await providerOnboardingRepository.findProviderByOwner(ownerUserId);
  if (!owner || owner.id !== providerId) {
    throw new ProviderForOnboardingNotFoundError();
  }
  return owner;
}

// ============================================================================
// Disponibilidad de slug (consultada en vivo desde el wizard)
// ============================================================================

/**
 * Indica si el slug propuesto está libre.
 *
 * Wrapper trivial sobre `slugExists` del repositorio para que el route
 * handler dependa solo de la fachada del módulo (no del repo directamente).
 * El handler aplica la validación de forma; este helper asume input ya
 * normalizado.
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const exists = await providerOnboardingRepository.slugExists(slug);
  return !exists;
}

// ============================================================================
// Paso 2 — crear Provider
// ============================================================================

/**
 * Crea el Provider a partir del input del paso 2 del wizard.
 *
 * Pasos:
 *  1. Validar con Zod.
 *  2. Comprobar que el usuario no tiene ya un Provider (idempotencia
 *     del wizard: si vuelve después de crearlo, debe ir a `loadOnboardingState`
 *     en lugar de duplicarlo).
 *  3. Resolver el `planId` del plan free.
 *  4. INSERT raw SQL con PostGIS. Si el slug está cogido (race),
 *     reportar `SlugAlreadyTakenError`.
 *  5. Crear el Professional inicial con horario por defecto (con
 *     `userId` del dueño si es `autonomo`, `null` si es `centro`).
 *
 * @throws OnboardingAlreadyCompleteError
 * @throws FreePlanNotSeededError
 * @throws SlugAlreadyTakenError
 */
export async function createProviderFromOnboarding(
  input: unknown,
  ownerUserId: string,
): Promise<{ providerId: string }> {
  const data = createProviderSchema.parse(input);

  const existing = await providerOnboardingRepository.findProviderByOwner(ownerUserId);
  if (existing) {
    throw new OnboardingAlreadyCompleteError();
  }

  const freePlan = await providerOnboardingRepository.findPlanByTier('free');
  if (!freePlan) {
    throw new FreePlanNotSeededError();
  }

  const inserted = await providerOnboardingRepository.insertProviderWithLocation({
    userId: ownerUserId,
    type: data.type,
    businessName: data.businessName,
    slug: data.slug,
    // `description` viene de Zod con keys opcionales; lo pasamos tal cual
    // y el repo lo serializa a jsonb sin perder claves ausentes.
    description: data.description,
    address: data.address,
    location: data.location,
    priceRange: data.priceRange,
    planId: freePlan.id,
  });

  if (!inserted) {
    // ON CONFLICT (slug) DO NOTHING → el slug ya estaba cogido. Es
    // raro porque el wizard valida disponibilidad antes, pero hay
    // ventana de carrera entre check y submit.
    throw new SlugAlreadyTakenError();
  }

  // Todo Provider nace con un Professional, sea autónomo o centro.
  //
  // Por qué también en centros: la disponibilidad se calcula desde
  // `Professional.schedule`, así que un centro sin ningún profesional
  // sale siempre en gris ("sin disponibilidad") en `/buscar` y es, a
  // efectos prácticos, invisible el día que se da de alta. Creamos un
  // registro placeholder con el nombre del negocio que el dueño puede
  // renombrar o sustituir cuando dé de alta su equipo real.
  //
  // Diferencia entre ambos casos: en autónomo el Professional es el
  // propio dueño (`userId = ownerUserId`); en centro es un recurso del
  // local sin cuenta Clerk asociada (`userId = null`), porque el titular
  // no tiene por qué atender él las citas.
  await providerOnboardingRepository.createProfessional({
    providerId: inserted.id,
    userId: data.type === 'autonomo' ? ownerUserId : null,
    name: data.businessName,
  });

  return { providerId: inserted.id };
}

// ============================================================================
// Paso 3 — fotos
// ============================================================================

/**
 * Actualiza la galería de fotos del Provider.
 *
 * Requiere ownership: si el `providerId` no pertenece al usuario, se
 * lanza `ProviderForOnboardingNotFoundError`.
 */
export async function updateProviderPhotos(
  providerId: string,
  input: unknown,
  ownerUserId: string,
): Promise<void> {
  const data = updatePhotosSchema.parse(input);
  await assertOwnership(providerId, ownerUserId);
  await providerOnboardingRepository.updatePhotos(providerId, data.photos);
}

// ============================================================================
// Paso 4 — primer servicio
// ============================================================================

/**
 * Crea el primer servicio del catálogo del proveedor.
 *
 * Reglas:
 *  - Ownership obligatorio.
 *  - `categoryId` debe existir.
 *  - Heredamos el `professionalId` del Professional inicial (existe
 *    tanto en `autonomo` como en `centro`) para que el servicio quede
 *    atado a un horario desde el primer día.
 *
 * @throws ProviderForOnboardingNotFoundError
 * @throws CategoryNotFoundError
 */
export async function createFirstServiceForProvider(
  providerId: string,
  input: unknown,
  ownerUserId: string,
): Promise<{ serviceId: string }> {
  const data = createFirstServiceSchema.parse(input);
  await assertOwnership(providerId, ownerUserId);

  const category = await providerOnboardingRepository.findCategoryById(data.categoryId);
  if (!category) {
    throw new CategoryNotFoundError();
  }

  // Heredamos el `professionalId` del profesional inicial. El `?? null`
  // cubre providers heredados creados antes de que los centros tuvieran
  // profesional por defecto: en esos el servicio queda sin atar y el
  // motor de availability resuelve por provider.
  const initialProfessional = await providerOnboardingRepository.findFirstProfessional(providerId);

  const created = await providerOnboardingRepository.createService({
    providerId,
    categoryId: data.categoryId,
    professionalId: initialProfessional?.id ?? null,
    name: data.name,
    // Para evitar columnas Json vacías en BD (NOT NULL en el schema),
    // si la UI no manda descripción persistimos un objeto vacío con la
    // clave del primer idioma del nombre. Mantiene la forma `{es, ca}`
    // que el resto del dominio espera.
    description: data.description ?? data.name,
    durationMinutes: data.durationMinutes,
    priceCents: data.priceCents,
  });

  return { serviceId: created.id };
}

// ============================================================================
// Paso 5 — plan
// ============================================================================

/**
 * Cambia el plan asociado al Provider.
 *
 * Stripe Billing (#61) gestionará el checkout real; aquí solo actualizamos
 * `planId`. Cuando el caller invoque este servicio para un tier de pago,
 * debe haber confirmado antes el `checkout.session.completed` del webhook.
 *
 * @throws ProviderForOnboardingNotFoundError
 * @throws PlanTierNotFoundError
 */
export async function selectPlan(
  providerId: string,
  input: unknown,
  ownerUserId: string,
): Promise<void> {
  const data = selectPlanSchema.parse(input);
  await assertOwnership(providerId, ownerUserId);

  const plan = await providerOnboardingRepository.findPlanByTier(data.planTier);
  if (!plan) {
    throw new PlanTierNotFoundError();
  }

  await providerOnboardingRepository.updatePlan(providerId, plan.id);
}

// ============================================================================
// Estado del wizard (hidratación)
// ============================================================================

/**
 * Devuelve el estado actual del onboarding para el usuario indicado.
 * Lo consume el `page.tsx` del wizard al entrar para arrancar en el
 * paso pendiente cuando el proveedor abandonó y vuelve.
 */
export async function loadOnboardingState(ownerUserId: string): Promise<OnboardingState> {
  return providerOnboardingRepository.getOnboardingState(ownerUserId);
}
