/**
 * Wrappers tipados sobre los endpoints del wizard de onboarding.
 *
 * Todos devuelven `{ data } | { error }` para que los consumidores
 * usen un patrón de `Result` en lugar de try/catch sobre `fetch`. Eso
 * facilita el branching en la UI (mostrar el `code` traducido) sin
 * propagar excepciones.
 */

import type { AppLocale } from '@/i18n/routing';

import type {
  OnboardingApiError,
  OnboardingApiResult,
  OnboardingApiState,
} from './onboarding.types';

/** Cabecera común JSON. */
const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

/**
 * Construye un `LocalizedText` con solo la clave del locale activo.
 * El backend exige al menos una clave con contenido y el wizard es
 * monolingüe en el locale del usuario.
 */
function localized(locale: AppLocale, value: string): Record<string, string> {
  return { [locale]: value };
}

/**
 * Lee la respuesta JSON con tolerancia a 204 / cuerpos vacíos.
 * `selectPlan` responde 204 sin body — devolvemos `{}` para esos casos.
 */
async function readJson<T>(response: Response): Promise<T> {
  if (response.status === 204) return {} as T;
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

/**
 * Adapta una respuesta HTTP a `OnboardingApiResult`. Si la respuesta
 * trae un error tipado del servidor (`{ error: { code } }`) lo
 * propagamos. Si no, devolvemos el payload bajo `data`.
 */
async function toResult<T>(response: Response): Promise<OnboardingApiResult<T>> {
  let payload: unknown;
  try {
    payload = await readJson<unknown>(response);
  } catch {
    return { error: { code: response.ok ? 'INTERNAL' : 'INTERNAL' } };
  }
  if (!response.ok) {
    const error = (payload as { error?: OnboardingApiError } | null)?.error;
    return { error: error ?? { code: 'INTERNAL' } };
  }
  return { data: payload as T };
}

/**
 * Envuelve `fetch` para capturar errores de red (offline, DNS) y
 * mapearlos a un `error.code = 'NETWORK'`. Cualquier otro fallo se
 * marca como `INTERNAL`.
 */
async function safeFetch<T>(input: string, init?: RequestInit): Promise<OnboardingApiResult<T>> {
  try {
    const response = await fetch(input, init);
    return await toResult<T>(response);
  } catch {
    return { error: { code: 'NETWORK' } };
  }
}

/** Tipos de payload de cada endpoint. */
interface CreateProviderPayload {
  type: 'autonomo' | 'centro';
  businessName: string;
  slug: string;
  vatNumber?: string;
  description: Record<string, string>;
  address: string;
  location: { lat: number; lng: number };
  priceRange: '€' | '€€' | '€€€';
}

interface CreateProviderResult {
  providerId: string;
}

interface CheckSlugResult {
  available: boolean;
}

interface CreateFirstServicePayload {
  providerId: string;
  categoryId: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  durationMinutes: number;
  priceCents: number;
}

interface CreateFirstServiceResult {
  serviceId: string;
}

interface SelectPlanPayload {
  providerId: string;
  planTier: 'free' | 'basic' | 'pro' | 'premium';
}

/**
 * `POST /api/provider-onboarding/create`
 *
 * Crea el Provider con los datos de los pasos 1-3 del wizard. Acepta el
 * `locale` activo para construir el `description: LocalizedText` con la
 * clave correcta.
 */
export async function apiCreateProvider(input: {
  locale: AppLocale;
  type: 'autonomo' | 'centro';
  businessName: string;
  slug: string;
  vatNumber?: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  priceRange: '€' | '€€' | '€€€';
}): Promise<OnboardingApiResult<CreateProviderResult>> {
  const body: CreateProviderPayload = {
    type: input.type,
    businessName: input.businessName,
    slug: input.slug,
    vatNumber: input.vatNumber && input.vatNumber.length > 0 ? input.vatNumber : undefined,
    description: localized(input.locale, input.description),
    address: input.address,
    location: { lat: input.lat, lng: input.lng },
    priceRange: input.priceRange,
  };
  return safeFetch<CreateProviderResult>('/api/provider-onboarding/create', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

/**
 * `GET /api/provider-onboarding/slug-availability?slug=...`
 *
 * Comprueba si un slug está libre. La validación de formato vive en el
 * caller para no quemar requests con slugs claramente inválidos.
 */
export async function apiCheckSlug(slug: string): Promise<OnboardingApiResult<CheckSlugResult>> {
  const url = `/api/provider-onboarding/slug-availability?slug=${encodeURIComponent(slug)}`;
  return safeFetch<CheckSlugResult>(url, { method: 'GET' });
}

/**
 * `POST /api/provider-onboarding/first-service`
 *
 * Crea el primer servicio del catálogo del Provider recién creado.
 */
export async function apiCreateFirstService(input: {
  locale: AppLocale;
  providerId: string;
  categoryId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
}): Promise<OnboardingApiResult<CreateFirstServiceResult>> {
  const body: CreateFirstServicePayload = {
    providerId: input.providerId,
    categoryId: input.categoryId,
    name: localized(input.locale, input.name),
    description:
      input.description && input.description.length > 0
        ? localized(input.locale, input.description)
        : undefined,
    durationMinutes: input.durationMinutes,
    priceCents: input.priceCents,
  };
  return safeFetch<CreateFirstServiceResult>('/api/provider-onboarding/first-service', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

/**
 * `PATCH /api/provider-onboarding/plan`
 *
 * Asigna el tier de plan al Provider. El wizard llama siempre con
 * `'free'`; el upgrade a planes de pago vivirá en `/panel/suscripcion`.
 */
export async function apiSelectPlan(
  providerId: string,
  planTier: SelectPlanPayload['planTier'] = 'free',
): Promise<OnboardingApiResult<Record<string, never>>> {
  const body: SelectPlanPayload = { providerId, planTier };
  return safeFetch<Record<string, never>>('/api/provider-onboarding/plan', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

/**
 * `GET /api/provider-onboarding/state`
 *
 * Carga el estado del wizard del usuario en sesión. Lo usa el wizard
 * para reintentar tras un `USER_NOT_SYNCED` y para hidratar la primera
 * vez si el usuario se trajo un draft antiguo.
 */
export async function apiGetState(): Promise<OnboardingApiResult<OnboardingApiState>> {
  return safeFetch<OnboardingApiState>('/api/provider-onboarding/state', { method: 'GET' });
}
