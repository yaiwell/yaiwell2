/**
 * Tests del servicio `provider-onboarding` (#57).
 *
 * Mockeamos `providerOnboardingRepository` con `vi.hoisted` para que el
 * mock esté listo antes de que el service lo importe. Así los tests
 * ejercen la lógica de negocio sin tocar Prisma ni BD.
 *
 * Cubrimos los caminos descritos en el prompt:
 *  - createProviderFromOnboarding: autónomo (Provider + Professional con
 *    userId del dueño), centro (Provider + Professional placeholder con
 *    userId null), slug duplicado, usuario ya con Provider, plan free no
 *    sembrado, validación Zod (slug con espacios, lat>90).
 *  - updateProviderPhotos: ownership OK, ownership fail, validación 0-6.
 *  - createFirstServiceForProvider: happy, categoría inexistente,
 *    ownership fail.
 *  - selectPlan: no-op (nunca escribe planId), propiedad, tier inexistente.
 *  - loadOnboardingState: estado completo, parcial, sin Provider.
 */

import { ZodError } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// El mock se declara con `vi.hoisted` para garantizar que la factory de
// `vi.mock` lo encuentra antes de que el service importe el repo.
const repoMock = vi.hoisted(() => ({
  insertProviderWithLocation: vi.fn(),
  findProviderByOwner: vi.fn(),
  slugExists: vi.fn(),
  updatePhotos: vi.fn(),
  createProfessional: vi.fn(),
  findFirstProfessional: vi.fn(),
  createService: vi.fn(),
  // La transacción ejecuta el callback con un cliente falso: el límite del
  // plan va mockeado aparte y aquí solo importa que el alta pase por él.
  runInTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true })),
  updatePlan: vi.fn(),
  findPlanByTier: vi.fn(),
  findCategoryById: vi.fn(),
  getOnboardingState: vi.fn(),
}));

vi.mock('./provider-onboarding.repository', () => ({
  providerOnboardingRepository: repoMock,
}));

const { assertCanPublishServiceMock, LimitError } = vi.hoisted(() => ({
  assertCanPublishServiceMock: vi.fn(),
  LimitError: class PlanServiceLimitReachedError extends Error {},
}));

vi.mock('@/lib/services/billing/billing.plan-limits', () => ({
  assertCanPublishService: assertCanPublishServiceMock,
  PlanServiceLimitReachedError: LimitError,
}));

import {
  CategoryNotFoundError,
  FreePlanNotSeededError,
  OnboardingAlreadyCompleteError,
  PlanTierNotFoundError,
  ProviderForOnboardingNotFoundError,
  SlugAlreadyTakenError,
} from './provider-onboarding.errors';
import {
  createFirstServiceForProvider,
  createProviderFromOnboarding,
  loadOnboardingState,
  selectPlan,
  updateProviderPhotos,
} from './provider-onboarding.service';

// ============================================================================
// Fixtures
// ============================================================================

const OWNER_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';
const PROVIDER_ID = 'b2c3d4e5-f6a7-4890-9bcd-ef0123456789';
const PROFESSIONAL_ID = 'c3d4e5f6-a7b8-4901-aabc-de0123456789';
const PLAN_ID = 'd4e5f6a7-b8c9-4012-8bcd-ef0123456789';
const CATEGORY_ID = 'e5f6a7b8-c9d0-4123-abcd-ef0123456789';

function validCreateProviderInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    type: 'autonomo',
    businessName: 'Atelier Norte',
    slug: 'atelier-norte',
    description: { es: 'Peluquería de barrio.', ca: 'Perruqueria de barri.' },
    address: 'Carrer Major 12, Palma',
    location: { lat: 39.57, lng: 2.65 },
    priceRange: '€€',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// createProviderFromOnboarding
// ============================================================================

describe('createProviderFromOnboarding', () => {
  it('crea Provider + Professional cuando el tipo es autonomo', async () => {
    repoMock.findProviderByOwner.mockResolvedValue(null);
    repoMock.findPlanByTier.mockResolvedValue({ id: PLAN_ID });
    repoMock.insertProviderWithLocation.mockResolvedValue({ id: PROVIDER_ID });
    repoMock.createProfessional.mockResolvedValue({ id: PROFESSIONAL_ID });

    const result = await createProviderFromOnboarding(validCreateProviderInput(), OWNER_ID);

    expect(result).toEqual({ providerId: PROVIDER_ID });
    expect(repoMock.findPlanByTier).toHaveBeenCalledWith('free');
    expect(repoMock.insertProviderWithLocation).toHaveBeenCalledOnce();
    expect(repoMock.createProfessional).toHaveBeenCalledOnce();
    const professionalArgs = repoMock.createProfessional.mock.calls[0][0];
    expect(professionalArgs).toMatchObject({
      providerId: PROVIDER_ID,
      userId: OWNER_ID,
      name: 'Atelier Norte',
    });
  });

  it('crea Provider + Professional placeholder (userId null) cuando el tipo es centro', async () => {
    repoMock.findProviderByOwner.mockResolvedValue(null);
    repoMock.findPlanByTier.mockResolvedValue({ id: PLAN_ID });
    repoMock.insertProviderWithLocation.mockResolvedValue({ id: PROVIDER_ID });
    repoMock.createProfessional.mockResolvedValue({ id: PROFESSIONAL_ID });

    await createProviderFromOnboarding(
      validCreateProviderInput({ type: 'centro', businessName: 'Estudio Sur' }),
      OWNER_ID,
    );

    expect(repoMock.insertProviderWithLocation).toHaveBeenCalledOnce();
    // Los centros también reciben profesional: sin horario no habría
    // disponibilidad y el centro nacería invisible en `/buscar`.
    expect(repoMock.createProfessional).toHaveBeenCalledOnce();
    expect(repoMock.createProfessional.mock.calls[0][0]).toMatchObject({
      providerId: PROVIDER_ID,
      userId: null,
      name: 'Estudio Sur',
    });
  });

  it('rechaza con SlugAlreadyTakenError cuando el INSERT no devuelve fila', async () => {
    repoMock.findProviderByOwner.mockResolvedValue(null);
    repoMock.findPlanByTier.mockResolvedValue({ id: PLAN_ID });
    repoMock.insertProviderWithLocation.mockResolvedValue(null);

    await expect(
      createProviderFromOnboarding(validCreateProviderInput(), OWNER_ID),
    ).rejects.toBeInstanceOf(SlugAlreadyTakenError);
    expect(repoMock.createProfessional).not.toHaveBeenCalled();
  });

  it('rechaza con OnboardingAlreadyCompleteError si el usuario ya tiene Provider', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: PROVIDER_ID, planId: PLAN_ID });

    await expect(
      createProviderFromOnboarding(validCreateProviderInput(), OWNER_ID),
    ).rejects.toBeInstanceOf(OnboardingAlreadyCompleteError);
    expect(repoMock.insertProviderWithLocation).not.toHaveBeenCalled();
  });

  it('rechaza con FreePlanNotSeededError si el plan free no existe', async () => {
    repoMock.findProviderByOwner.mockResolvedValue(null);
    repoMock.findPlanByTier.mockResolvedValue(null);

    await expect(
      createProviderFromOnboarding(validCreateProviderInput(), OWNER_ID),
    ).rejects.toBeInstanceOf(FreePlanNotSeededError);
    expect(repoMock.insertProviderWithLocation).not.toHaveBeenCalled();
  });

  it('rechaza con ZodError si el slug contiene espacios', async () => {
    await expect(
      createProviderFromOnboarding(validCreateProviderInput({ slug: 'atelier norte' }), OWNER_ID),
    ).rejects.toBeInstanceOf(ZodError);
    expect(repoMock.findProviderByOwner).not.toHaveBeenCalled();
  });

  it('rechaza con ZodError si la latitud está fuera de rango', async () => {
    await expect(
      createProviderFromOnboarding(
        validCreateProviderInput({ location: { lat: 95, lng: 2.65 } }),
        OWNER_ID,
      ),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

// ============================================================================
// updateProviderPhotos
// ============================================================================

describe('updateProviderPhotos', () => {
  it('actualiza las fotos cuando el usuario es dueño del Provider', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: PROVIDER_ID, planId: PLAN_ID });

    await updateProviderPhotos(
      PROVIDER_ID,
      { photos: ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg'] },
      OWNER_ID,
    );

    expect(repoMock.updatePhotos).toHaveBeenCalledOnce();
    expect(repoMock.updatePhotos.mock.calls[0][1]).toHaveLength(2);
  });

  it('rechaza con ProviderForOnboardingNotFoundError si el usuario no es dueño', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: 'otro-provider', planId: PLAN_ID });

    await expect(
      updateProviderPhotos(PROVIDER_ID, { photos: [] }, OWNER_ID),
    ).rejects.toBeInstanceOf(ProviderForOnboardingNotFoundError);
    expect(repoMock.updatePhotos).not.toHaveBeenCalled();
  });

  it('acepta 0 fotos (paso opcional)', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: PROVIDER_ID, planId: PLAN_ID });

    await updateProviderPhotos(PROVIDER_ID, { photos: [] }, OWNER_ID);

    expect(repoMock.updatePhotos).toHaveBeenCalledWith(PROVIDER_ID, []);
  });

  it('rechaza con ZodError si pasan más de 6 fotos', async () => {
    const photos = Array.from({ length: 7 }, (_, i) => `https://cdn.example/${i}.jpg`);
    await expect(updateProviderPhotos(PROVIDER_ID, { photos }, OWNER_ID)).rejects.toBeInstanceOf(
      ZodError,
    );
  });
});

// ============================================================================
// createFirstServiceForProvider
// ============================================================================

describe('createFirstServiceForProvider', () => {
  const baseInput = {
    categoryId: CATEGORY_ID,
    name: { es: 'Corte', ca: 'Tall' },
    durationMinutes: 30,
    priceCents: 2500,
  };

  it('crea el servicio heredando el profesional inicial en autónomos', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: PROVIDER_ID, planId: PLAN_ID });
    repoMock.findCategoryById.mockResolvedValue({ id: CATEGORY_ID });
    repoMock.findFirstProfessional.mockResolvedValue({ id: PROFESSIONAL_ID });
    repoMock.createService.mockResolvedValue({ id: 'service-1' });

    const result = await createFirstServiceForProvider(PROVIDER_ID, baseInput, OWNER_ID);

    expect(result).toEqual({ serviceId: 'service-1' });
    expect(repoMock.createService).toHaveBeenCalledOnce();
    const args = repoMock.createService.mock.calls[0][0];
    expect(args.professionalId).toBe(PROFESSIONAL_ID);
    expect(args.providerId).toBe(PROVIDER_ID);
  });

  it('comprueba el límite del plan dentro de la misma transacción que el alta', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: PROVIDER_ID, planId: PLAN_ID });
    repoMock.findCategoryById.mockResolvedValue({ id: CATEGORY_ID });
    repoMock.findFirstProfessional.mockResolvedValue({ id: PROFESSIONAL_ID });
    repoMock.createService.mockResolvedValue({ id: 'service-1' });
    assertCanPublishServiceMock.mockResolvedValueOnce({ activeCount: 0, maxServices: 1 });

    await createFirstServiceForProvider(PROVIDER_ID, baseInput, OWNER_ID);

    expect(assertCanPublishServiceMock).toHaveBeenCalledWith({ tx: true }, PROVIDER_ID);
    expect(repoMock.createService.mock.calls[0][1]).toEqual({ tx: true });
  });

  it('no crea el servicio si el plan ya está en el límite', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: PROVIDER_ID, planId: PLAN_ID });
    repoMock.findCategoryById.mockResolvedValue({ id: CATEGORY_ID });
    repoMock.findFirstProfessional.mockResolvedValue({ id: PROFESSIONAL_ID });
    assertCanPublishServiceMock.mockRejectedValueOnce(new LimitError());

    await expect(
      createFirstServiceForProvider(PROVIDER_ID, baseInput, OWNER_ID),
    ).rejects.toBeInstanceOf(LimitError);
    expect(repoMock.createService).not.toHaveBeenCalled();
  });

  it('rechaza con CategoryNotFoundError si la categoría no existe', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: PROVIDER_ID, planId: PLAN_ID });
    repoMock.findCategoryById.mockResolvedValue(null);

    await expect(
      createFirstServiceForProvider(PROVIDER_ID, baseInput, OWNER_ID),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(repoMock.createService).not.toHaveBeenCalled();
  });

  it('rechaza con ProviderForOnboardingNotFoundError si el usuario no es dueño', async () => {
    repoMock.findProviderByOwner.mockResolvedValue(null);

    await expect(
      createFirstServiceForProvider(PROVIDER_ID, baseInput, OWNER_ID),
    ).rejects.toBeInstanceOf(ProviderForOnboardingNotFoundError);
    expect(repoMock.findCategoryById).not.toHaveBeenCalled();
  });
});

// ============================================================================
// selectPlan
// ============================================================================

describe('selectPlan', () => {
  it('confirmar Gratis es un no-op: el negocio ya nace en Gratis', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: PROVIDER_ID, planId: 'free-plan-id' });
    repoMock.findPlanByTier.mockResolvedValue({ id: 'free-plan-id' });

    await selectPlan(PROVIDER_ID, { planTier: 'free' }, OWNER_ID);

    expect(repoMock.findPlanByTier).toHaveBeenCalledWith('free');
    expect(repoMock.updatePlan).not.toHaveBeenCalled();
  });

  it('nunca baja a Gratis un negocio que ya paga un plan', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: PROVIDER_ID, planId: 'pro-plan-id' });
    repoMock.findPlanByTier.mockResolvedValue({ id: 'free-plan-id' });

    await expect(selectPlan(PROVIDER_ID, { planTier: 'free' }, OWNER_ID)).resolves.toBeUndefined();
    expect(repoMock.updatePlan).not.toHaveBeenCalled();
  });

  it('rechaza si el negocio no es del usuario', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: 'otro', planId: 'free-plan-id' });

    await expect(selectPlan(PROVIDER_ID, { planTier: 'free' }, OWNER_ID)).rejects.toBeInstanceOf(
      ProviderForOnboardingNotFoundError,
    );
  });

  it('rechaza con PlanTierNotFoundError si el tier no está en BD', async () => {
    repoMock.findProviderByOwner.mockResolvedValue({ id: PROVIDER_ID, planId: PLAN_ID });
    repoMock.findPlanByTier.mockResolvedValue(null);

    await expect(selectPlan(PROVIDER_ID, { planTier: 'free' }, OWNER_ID)).rejects.toBeInstanceOf(
      PlanTierNotFoundError,
    );
    expect(repoMock.updatePlan).not.toHaveBeenCalled();
  });

  it('rechaza un plan de pago sin pasar por Stripe', async () => {
    await expect(
      selectPlan(PROVIDER_ID, { planTier: 'premium' } as never, OWNER_ID),
    ).rejects.toThrow();
    expect(repoMock.updatePlan).not.toHaveBeenCalled();
  });
});

// ============================================================================
// loadOnboardingState
// ============================================================================

describe('loadOnboardingState', () => {
  it('devuelve estado completo cuando hay Provider con fotos y servicio', async () => {
    const stateCompleted = {
      providerId: PROVIDER_ID,
      step: 'completed' as const,
      hasPhotos: true,
      hasFirstService: true,
      planTier: 'free',
    };
    repoMock.getOnboardingState.mockResolvedValue(stateCompleted);

    const result = await loadOnboardingState(OWNER_ID);

    expect(result).toEqual(stateCompleted);
  });

  it('devuelve estado parcial cuando solo hay Provider sin fotos ni servicio', async () => {
    const statePartial = {
      providerId: PROVIDER_ID,
      step: 3 as const,
      hasPhotos: false,
      hasFirstService: false,
      planTier: 'free',
    };
    repoMock.getOnboardingState.mockResolvedValue(statePartial);

    const result = await loadOnboardingState(OWNER_ID);

    expect(result.step).toBe(3);
    expect(result.hasPhotos).toBe(false);
  });

  it('devuelve estado vacío cuando el usuario no tiene Provider', async () => {
    const stateEmpty = {
      providerId: null,
      step: 1 as const,
      hasPhotos: false,
      hasFirstService: false,
      planTier: null,
    };
    repoMock.getOnboardingState.mockResolvedValue(stateEmpty);

    const result = await loadOnboardingState(OWNER_ID);

    expect(result.providerId).toBeNull();
    expect(result.step).toBe(1);
  });
});
