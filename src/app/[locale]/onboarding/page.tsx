import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { OnboardingWizard } from '@/components/features/onboarding/OnboardingWizard';
import type {
  OnboardingApiState,
  PlanTierChoice,
  RootCategory,
} from '@/components/features/onboarding/shared';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import type { AppLocale } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import {
  isPlanTierId,
  listPublicPlans,
  PlansNotSeededError,
  type PublicPlan,
} from '@/lib/services/plans';
import { loadOnboardingState } from '@/lib/services/provider-onboarding';
import { ensureUserFromClerk, MissingPrimaryEmailError } from '@/lib/services/user';

interface OnboardingPageProps {
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Página del wizard de onboarding del proveedor (#57).
 *
 * Server Component que pre-carga:
 *  - Categorías raíz (parentId: null) para el paso 4.
 *  - Catálogo de planes y plan elegido en el registro para el paso 5.
 *  - Estado actual del onboarding (`OnboardingApiState`) para hidratar.
 *  - Flag `userPending` cuando la sincronización Clerk→DB aún no ha
 *    propagado el `User` interno.
 *
 * Vive fuera de `/panel/` deliberadamente: el layout de `/panel` llama
 * a `requireCurrentProvider`, que redirige a `/onboarding` cuando no
 * hay row de Provider. Mantenerlo aquí evita el bucle.
 */
export async function generateMetadata({ params }: OnboardingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'onboarding.meta' });
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

/**
 * Plan elegido en el registro. Viaja en `unsafeMetadata.selectedPlan`
 * (lo escribe el propio navegador al darse de alta), así que se valida
 * contra el catálogo: cualquier otra cosa empieza en Gratis.
 */
async function readSelectedPlan(): Promise<PlanTierChoice> {
  const user = await currentUser();
  const raw: unknown = user?.unsafeMetadata?.selectedPlan;
  return isPlanTierId(raw) ? raw : 'free';
}

/**
 * Catálogo para el paso de plan. Si la tabla está vacía el wizard sigue
 * (el negocio nace en Gratis igualmente) y el paso muestra un aviso.
 */
async function loadPlans(): Promise<PublicPlan[]> {
  try {
    return await listPublicPlans();
  } catch (err) {
    if (err instanceof PlansNotSeededError) {
      console.error('[onboarding] plans not seeded:', err);
      return [];
    }
    throw err;
  }
}

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Solo proveedores autenticados acceden al wizard. Clerk redirige
  // automáticamente a clientes/admins a su destino natural.
  await requireRole(['provider'], locale);

  // Resolución del `User` interno a partir del `clerkId` activo.
  // `ensureUserFromClerk` lo crea sobre la marcha si no existe (por
  // ejemplo cuando el webhook `user.created` no llegó). Sin esta red,
  // el wizard quedaba colgado en "Sincronizando…" para usuarios que
  // se crearon en Clerk antes de configurar el webhook.
  const { userId: clerkUserId } = await auth();
  let internalUser: { id: string } | null = null;
  if (clerkUserId) {
    try {
      internalUser = await ensureUserFromClerk(clerkUserId);
    } catch (err) {
      // Caso patológico: el user de Clerk no tiene ningún email del que
      // tirar. Dejamos `internalUser=null` para que la UI muestre la
      // pantalla "syncing…" (es lo más informativo en este edge case;
      // soporte tendrá que intervenir manualmente).
      if (!(err instanceof MissingPrimaryEmailError)) throw err;
    }
  }

  // Estado inicial del wizard. Si el user aún no existe lo damos vacío
  // para que la UI pinte el syncing screen y reintente desde el cliente.
  let initialState: OnboardingApiState = {
    providerId: null,
    step: 1,
    hasPhotos: false,
    hasFirstService: false,
    planTier: null,
  };
  const userPending = !internalUser;

  if (internalUser) {
    const state = await loadOnboardingState(internalUser.id);
    // Si el onboarding ya está completo, no tiene sentido entrar al
    // wizard: lo enviamos directamente al panel.
    if (state.step === 'completed') {
      redirect({ href: '/panel', locale });
    }
    initialState = {
      providerId: state.providerId,
      step: state.step,
      hasPhotos: state.hasPhotos,
      hasFirstService: state.hasFirstService,
      planTier: state.planTier,
    };
  }

  // Pre-carga de categorías raíz para el paso 4. Ordenadas por nombre
  // estable; el componente las muestra en el locale activo.
  // El plan y el catálogo van en paralelo con las categorías.
  const [rawCategories, plans, selectedPlan] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, slug: true, name: true, icon: true },
      orderBy: { slug: 'asc' },
    }),
    loadPlans(),
    readSelectedPlan(),
  ]);
  // Sin catálogo no se puede contratar nada: se empieza en Gratis.
  const initialPlan: PlanTierChoice = plans.some((plan) => plan.tier === selectedPlan)
    ? selectedPlan
    : 'free';

  // El campo `name` es Json en Prisma; lo normalizamos al shape que
  // espera la UI sin acoplarla a tipos de Prisma.
  const categoriesPreloaded: RootCategory[] = rawCategories.map((c) => ({
    id: c.id,
    slug: c.slug,
    // `name` es `Json` en Prisma; el shape real es `LocalizedText`
    // (solo `es` garantizado, ver `@/types/domain`).
    name: c.name as unknown as RootCategory['name'],
    icon: c.icon,
  }));

  return (
    <OnboardingWizard
      initialState={initialState}
      categoriesPreloaded={categoriesPreloaded}
      locale={locale as AppLocale}
      userPending={userPending}
      plans={plans}
      initialPlan={initialPlan}
    />
  );
}
