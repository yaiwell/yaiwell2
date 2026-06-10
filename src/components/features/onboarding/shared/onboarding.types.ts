/**
 * Tipos compartidos del wizard de onboarding del proveedor (#57 UI).
 *
 * Convención clave: el wizard tiene 5 pasos en UI que mapean a 4
 * mutaciones independientes (estrategia idempotente). Los tipos viven
 * aquí para que los hooks de cada paso, el orquestador y la API client
 * compartan el mismo contrato.
 */

import type { AppLocale } from '@/i18n/routing';

/** Pasos del wizard. */
export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

/** Tipo de proveedor que se está dando de alta. */
export type BusinessType = 'autonomo' | 'centro';

/** Rango de precio cualitativo del paso 2. */
export type PriceRangeChoice = '€' | '€€' | '€€€';

/** Tier de plan disponible (el wizard solo asigna 'free'). */
export type PlanTierChoice = 'free' | 'basic' | 'pro' | 'premium';

/**
 * Estado serializable del wizard que persistimos en sessionStorage.
 *
 * Todos los campos son opcionales porque el draft se construye paso a
 * paso. El `locale` que guardamos sirve para decidir bajo qué clave del
 * `LocalizedText` enviar `description` y `serviceName` al backend.
 */
export interface OnboardingDraft {
  step: OnboardingStep;
  locale: AppLocale;
  // Paso 1.
  businessType?: BusinessType;
  // Paso 2.
  businessName?: string;
  slug?: string;
  vatNumber?: string;
  description?: string;
  priceRange?: PriceRangeChoice;
  // Paso 3.
  address?: string;
  lat?: number;
  lng?: number;
  // Paso 4.
  categoryId?: string;
  serviceName?: string;
  serviceDescription?: string;
  serviceDurationMinutes?: number;
  servicePriceEuros?: number;
  // Paso 5 — acepta términos antes de publicar.
  termsAccepted?: boolean;
}

/**
 * Foto del estado de onboarding que devuelve `GET /state` para hidratar
 * el wizard cuando el proveedor retoma el flujo. Espejo del tipo del
 * backend (`OnboardingState`) pero sin import directo para mantener la
 * frontera UI ↔ servicio limpia.
 */
export interface OnboardingApiState {
  providerId: string | null;
  step: OnboardingStep | 'completed';
  hasPhotos: boolean;
  hasFirstService: boolean;
  planTier: string | null;
}

/**
 * Forma del error que devuelven los handlers del wizard.
 * Mantiene el `code` estable (mapeado en el namespace i18n `onboarding.errors`).
 */
export interface OnboardingApiError {
  code: string;
  message?: string;
}

/** Tipo de retorno común para los wrappers del API client. */
export type OnboardingApiResult<T> = { data: T } | { error: OnboardingApiError };

/**
 * Categoría raíz pre-cargada server-side y pasada como prop al wizard.
 * Forma mínima para no acoplar el cliente a tipos de Prisma.
 */
export interface RootCategory {
  id: string;
  slug: string;
  name: { es: string; ca: string; en?: string; de?: string };
  icon: string;
}

/**
 * Props que el `page.tsx` pasa al orquestador `<OnboardingWizard />`.
 */
export interface OnboardingInitialProps {
  initialState: OnboardingApiState;
  categoriesPreloaded: RootCategory[];
  locale: AppLocale;
  /**
   * `true` cuando el `User` interno aún no se sincronizó tras el signup
   * de Clerk (webhook en vuelo). El wizard muestra una pantalla de
   * "syncing…" con retry automático.
   */
  userPending: boolean;
}
