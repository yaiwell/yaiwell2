/**
 * Tipos del dominio del wizard de onboarding del proveedor (#57).
 *
 * Modelan los inputs de cada paso del wizard tal y como los recibe el
 * servicio desde el borde (route handlers o server actions). Adrede no
 * importan tipos de Prisma: el repositorio se encarga de mapear estos
 * tipos al modelo de BD para que la frontera quede limpia y los tests
 * del service no arrastren tipos generados.
 *
 * El estado `OnboardingState` lo consume el `page.tsx` del wizard para
 * decidir en qué paso debe arrancar la sesión cuando el proveedor
 * vuelve después de abandonar a mitad del flujo (idempotencia §57).
 */

import type { LocalizedText } from '@/types/domain';

/** Tipo de proveedor que se está dando de alta. */
export type BusinessType = 'autonomo' | 'centro';

/**
 * Rango de precio cualitativo que el usuario marca en el paso 2.
 * Coincide con el enum de `PriceRange` de Prisma — el repository hace
 * el mapeo al valor mapeado `euro | euro2 | euro3`.
 */
export type PriceRangeChoice = '€' | '€€' | '€€€';

/**
 * Tier de plan de suscripción seleccionable en el paso 5. Coincide
 * con `PlanTier` de Prisma (free / basic / pro / premium).
 */
export type PlanTierChoice = 'free' | 'basic' | 'pro' | 'premium';

/**
 * Input completo del paso 2 del wizard: cuando se valida con éxito,
 * el servicio crea el row `Provider` en BD usando estos datos.
 *
 * `email` y `phone` quedan como opcionales porque el modelo actual de
 * Prisma no los persiste (vienen del usuario Clerk); se aceptan en el
 * input para que la UI los recoja sin romper el contrato si en una
 * futura iteración añadimos columnas a `Provider`.
 */
export interface CreateProviderInput {
  type: BusinessType;
  businessName: string;
  slug: string;
  description: LocalizedText;
  address: string;
  location: { lat: number; lng: number };
  priceRange: PriceRangeChoice;
  email?: string;
  phone?: string;
}

/** Input del paso 3: gestión de las fotos del proveedor. */
export interface UpdatePhotosInput {
  /** URLs absolutas en Supabase Storage. Máx. 6 para no saturar el card. */
  photos: string[];
}

/**
 * Input del paso 4: primer servicio del catálogo. La descripción es
 * opcional porque el wizard ofrece dejarla para más tarde.
 */
export interface CreateFirstServiceInput {
  categoryId: string;
  name: LocalizedText;
  description?: LocalizedText;
  durationMinutes: number;
  priceCents: number;
}

/** Input del paso 5: elección de plan de suscripción. */
export interface SelectPlanInput {
  planTier: PlanTierChoice;
}

/**
 * Foto del estado de onboarding del usuario actual.
 *
 * El `page.tsx` lo consulta al entrar para decidir `initialStep` y
 * pintar el wizard ya hidratado si el proveedor abandonó y vuelve.
 *
 * `step` puede ser un número 1-5 (siguiente paso pendiente) o
 * `'completed'` cuando no falta nada por hacer.
 */
export interface OnboardingState {
  providerId: string | null;
  step: 1 | 2 | 3 | 4 | 5 | 'completed';
  hasPhotos: boolean;
  hasFirstService: boolean;
  planTier: string | null;
}
