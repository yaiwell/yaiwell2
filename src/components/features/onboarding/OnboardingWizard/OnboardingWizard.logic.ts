'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AppLocale } from '@/i18n/routing';

import type { SlugStatus } from '../steps/BusinessDataStep';
import {
  apiCreateFirstService,
  apiCreateProvider,
  apiGetState,
  apiSelectPlan,
  businessDataStepSchema,
  businessTypeStepSchema,
  categoriesServiceStepSchema,
  clearDraft,
  confirmStepSchema,
  loadDraft,
  locationStepSchema,
  saveDraft,
} from '../shared';
import type {
  OnboardingApiError,
  OnboardingApiState,
  OnboardingDraft,
  OnboardingStep,
} from '../shared';

/** Total de pasos del wizard. */
const TOTAL_STEPS = 5;

/** Polling para reintentar `apiGetState` cuando hay `USER_NOT_SYNCED`. */
const SYNC_POLL_INTERVAL_MS = 2_000;
const SYNC_MAX_ATTEMPTS = 5;

/**
 * Estado inicial del draft. Garantiza el `step: 1` para arrancar
 * siempre desde el primer paso si no hay nada que hidratar.
 */
function emptyDraft(locale: AppLocale): OnboardingDraft {
  return {
    step: 1,
    locale,
    serviceDurationMinutes: 30,
    servicePriceEuros: 0,
  };
}

/**
 * Salto de paso inicial calculado a partir del `apiState`. Si el
 * usuario ya tiene Provider, saltamos al paso correspondiente para
 * que retomar el flujo sea indoloro.
 */
function stepFromApiState(state: OnboardingApiState): OnboardingStep {
  if (state.step === 'completed') return 5;
  return state.step;
}

/**
 * Reglas de "paso completo" — habilitan el botón Next del orquestador.
 * Espejo de los schemas Zod pero rápido (sin parseo) para evaluar en
 * cada render sin coste perceptible.
 */
function isStepReady(
  step: OnboardingStep,
  draft: OnboardingDraft,
  slugStatus: SlugStatus,
): boolean {
  switch (step) {
    case 1:
      return businessTypeStepSchema.safeParse({ businessType: draft.businessType }).success;
    case 2: {
      const parsed = businessDataStepSchema.safeParse({
        businessName: draft.businessName ?? '',
        slug: draft.slug ?? '',
        vatNumber: draft.vatNumber ?? '',
        description: draft.description ?? '',
        priceRange: draft.priceRange,
      });
      // El paso 2 requiere además que el slug esté libre.
      return parsed.success && slugStatus === 'available';
    }
    case 3:
      return locationStepSchema.safeParse({
        address: draft.address ?? '',
        lat: draft.lat,
        lng: draft.lng,
      }).success;
    case 4:
      return categoriesServiceStepSchema.safeParse({
        categoryId: draft.categoryId ?? '',
        serviceName: draft.serviceName ?? '',
        serviceDescription: draft.serviceDescription ?? '',
        serviceDurationMinutes: draft.serviceDurationMinutes ?? 0,
        servicePriceEuros: draft.servicePriceEuros ?? 0,
      }).success;
    case 5:
      return confirmStepSchema.safeParse({ termsAccepted: draft.termsAccepted === true }).success;
    default:
      return false;
  }
}

/**
 * Hook principal del wizard. Centraliza:
 *  - hidratación draft + apiState
 *  - navegación entre pasos
 *  - estado del slug (compartido entre paso 2 y paso 5)
 *  - dispatch a APIs (createProvider, createFirstService, selectPlan)
 *  - manejo de errores tipados (SLUG_ALREADY_TAKEN, USER_NOT_SYNCED)
 */
export function useOnboardingWizard(params: {
  initialState: OnboardingApiState;
  locale: AppLocale;
  userPending: boolean;
  /** Redirección al panel cuando publicar termina con éxito. */
  onComplete: () => void;
}) {
  const { initialState, locale, userPending, onComplete } = params;

  // Estado del draft. Hidratamos en el mount con `loadDraft()` (cliente).
  const [draft, setDraft] = useState<OnboardingDraft>(() => emptyDraft(locale));
  const [hydrated, setHydrated] = useState(false);

  // `providerId` que devuelve la mutación del paso 1-3 al crear el
  // Provider. Se persiste fuera del draft porque es información del
  // server, no del usuario.
  const [providerId, setProviderId] = useState<string | null>(initialState.providerId);

  // Estado del slug (lo gestiona el paso 2 pero el orquestador lo lee
  // para decidir si Next está habilitado).
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');

  // Mutation flags por paso para deshabilitar el botón mientras la
  // API responde, y errores tipados a mostrar como banner.
  const [isMutating, setIsMutating] = useState(false);
  const [stepError, setStepError] = useState<OnboardingApiError | null>(null);

  // Estado de "syncing…" para retry automático de apiGetState.
  const [syncing, setSyncing] = useState(userPending);
  const syncAttemptsRef = useRef(0);

  // Hidratación cliente del draft persistido. Se ejecuta una sola vez
  // al montar: leer sessionStorage requiere window, así que es un caso
  // legítimo de setState en useEffect (no hay alternativa SSR-safe).
  useEffect(() => {
    const persisted = loadDraft();
    if (persisted && persisted.locale === locale) {
      // Si el apiState ya tiene providerId avanzado, respetamos su step
      // por encima del draft (idempotencia: la fuente de verdad es el
      // server). Si no, recogemos el draft tal cual.
      const stepFromServer = stepFromApiState(initialState);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft({
        ...persisted,
        step: Math.max(persisted.step, stepFromServer) as OnboardingStep,
      });
    } else {
      // Sin draft válido: arrancamos en el paso que diga el server.
      setDraft({
        ...emptyDraft(locale),
        step: stepFromApiState(initialState),
      });
    }
    setHydrated(true);
  }, [initialState, locale]);

  // Persistimos el draft con debounce cada vez que cambia.
  useEffect(() => {
    if (!hydrated) return;
    saveDraft(draft);
  }, [draft, hydrated]);

  // Retry automático mientras el usuario aún no esté sincronizado.
  useEffect(() => {
    if (!syncing) return;
    if (syncAttemptsRef.current >= SYNC_MAX_ATTEMPTS) return;
    const handle = window.setTimeout(async () => {
      syncAttemptsRef.current += 1;
      const result = await apiGetState();
      if ('data' in result) {
        setSyncing(false);
        setProviderId(result.data.providerId);
        // Si el server saltó pasos por nosotros, alineamos el draft.
        setDraft((prev) => ({
          ...prev,
          step: Math.max(prev.step, stepFromApiState(result.data)) as OnboardingStep,
        }));
      }
    }, SYNC_POLL_INTERVAL_MS);
    return () => window.clearTimeout(handle);
  }, [syncing]);

  /** Cambia los campos del draft (patch superficial). */
  const updateDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  /** Cambia de paso preservando rango válido. */
  const goToStep = useCallback((next: OnboardingStep) => {
    setStepError(null);
    setDraft((prev) => ({ ...prev, step: next }));
  }, []);

  /**
   * Dispatch del paso 2-3 unificado: crear el Provider. Lo lanzamos al
   * pulsar "Siguiente" en el paso 3 (datos del Provider completos).
   */
  const createProvider = useCallback(async (): Promise<boolean> => {
    if (
      !draft.businessType ||
      !draft.businessName ||
      !draft.slug ||
      !draft.description ||
      !draft.priceRange ||
      !draft.address ||
      draft.lat === undefined ||
      draft.lng === undefined
    ) {
      return false;
    }
    setIsMutating(true);
    const result = await apiCreateProvider({
      locale,
      type: draft.businessType,
      businessName: draft.businessName,
      slug: draft.slug,
      vatNumber: draft.vatNumber,
      description: draft.description,
      address: draft.address,
      lat: draft.lat,
      lng: draft.lng,
      priceRange: draft.priceRange,
    });
    setIsMutating(false);
    if ('error' in result) {
      setStepError(result.error);
      // SLUG_ALREADY_TAKEN nos manda de vuelta al paso 2 para que el
      // usuario elija otra cadena.
      if (result.error.code === 'SLUG_ALREADY_TAKEN') {
        setSlugStatus('taken');
        setDraft((prev) => ({ ...prev, step: 2 }));
      }
      return false;
    }
    setProviderId(result.data.providerId);
    return true;
  }, [draft, locale]);

  /** Dispatch del paso 4: crear el primer servicio. */
  const createFirstService = useCallback(async (): Promise<boolean> => {
    if (
      !providerId ||
      !draft.categoryId ||
      !draft.serviceName ||
      draft.serviceDurationMinutes === undefined ||
      draft.servicePriceEuros === undefined
    ) {
      return false;
    }
    setIsMutating(true);
    const result = await apiCreateFirstService({
      locale,
      providerId,
      categoryId: draft.categoryId,
      name: draft.serviceName,
      description: draft.serviceDescription,
      durationMinutes: draft.serviceDurationMinutes,
      // Convertimos euros → céntimos justo en el borde.
      priceCents: Math.round(draft.servicePriceEuros * 100),
    });
    setIsMutating(false);
    if ('error' in result) {
      setStepError(result.error);
      return false;
    }
    return true;
  }, [draft, locale, providerId]);

  /** Dispatch del paso 5: seleccionar plan free y publicar. */
  const finalizePlan = useCallback(async (): Promise<boolean> => {
    if (!providerId) return false;
    setIsMutating(true);
    const result = await apiSelectPlan(providerId, 'free');
    setIsMutating(false);
    if ('error' in result) {
      // `ONBOARDING_ALREADY_COMPLETE` se tolera: significa que un
      // refresco rápido nos lleva al panel.
      if (result.error.code !== 'ONBOARDING_ALREADY_COMPLETE') {
        setStepError(result.error);
        return false;
      }
    }
    clearDraft();
    onComplete();
    return true;
  }, [onComplete, providerId]);

  /**
   * Avanza al siguiente paso, disparando la mutación que corresponda
   * al pulsar Next. Es el callback central del orquestador.
   */
  const handleNext = useCallback(async () => {
    setStepError(null);
    if (draft.step < 3) {
      goToStep((draft.step + 1) as OnboardingStep);
      return;
    }
    if (draft.step === 3) {
      const created = await createProvider();
      if (created) goToStep(4);
      return;
    }
    if (draft.step === 4) {
      const created = await createFirstService();
      if (created) goToStep(5);
      return;
    }
    if (draft.step === 5) {
      await finalizePlan();
    }
  }, [createFirstService, createProvider, draft.step, finalizePlan, goToStep]);

  const handleBack = useCallback(() => {
    setStepError(null);
    setDraft((prev) =>
      prev.step > 1 ? { ...prev, step: (prev.step - 1) as OnboardingStep } : prev,
    );
  }, []);

  const ready = useMemo(() => isStepReady(draft.step, draft, slugStatus), [draft, slugStatus]);

  return {
    draft,
    hydrated,
    syncing,
    providerId,
    slugStatus,
    setSlugStatus,
    stepError,
    isMutating,
    ready,
    totalSteps: TOTAL_STEPS,
    updateDraft,
    goToStep,
    handleNext,
    handleBack,
  };
}
