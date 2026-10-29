'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AppLocale } from '@/i18n/routing';

import type { SlugStatus } from '../steps/BusinessDataStep';
import { apiGetState, loadDraft, saveDraft } from '../shared';
import type {
  OnboardingApiError,
  OnboardingApiState,
  OnboardingDraft,
  OnboardingStep,
  PlanTierChoice,
} from '../shared';

import { emptyDraft, isStepReady, stepFromApiState } from './OnboardingWizard.steps';
import { useOnboardingMutations } from './useOnboardingMutations';

/** Total de pasos del wizard. */
const TOTAL_STEPS = 6;

/** Polling para reintentar `apiGetState` cuando hay `USER_NOT_SYNCED`. */
const SYNC_POLL_INTERVAL_MS = 2_000;
const SYNC_MAX_ATTEMPTS = 5;

/**
 * Hook principal del wizard. Centraliza:
 *  - hidratación draft + apiState
 *  - navegación entre pasos
 *  - estado del slug (compartido entre paso 2 y paso 5)
 *  - dispatch a APIs (delegado en `useOnboardingMutations`)
 *  - manejo de errores tipados (SLUG_ALREADY_TAKEN, USER_NOT_SYNCED)
 */
export function useOnboardingWizard(params: {
  initialState: OnboardingApiState;
  locale: AppLocale;
  userPending: boolean;
  /** Plan preseleccionado en el registro (o Gratis). */
  initialPlan: PlanTierChoice;
  /** Navegación interna al terminar (panel, o plan con aviso). */
  onComplete: (href: string) => void;
}) {
  const { initialState, locale, userPending, initialPlan, onComplete } = params;

  // Estado del draft. Hidratamos en el mount con `loadDraft()` (cliente).
  const [draft, setDraft] = useState<OnboardingDraft>(() => emptyDraft(locale, initialPlan));
  const [hydrated, setHydrated] = useState(false);

  // `providerId` que devuelve la mutación del paso 1-3 al crear el
  // Provider. Se persiste fuera del draft porque es información del
  // server, no del usuario.
  const [providerId, setProviderId] = useState<string | null>(initialState.providerId);

  // Estado del slug (lo gestiona el paso 2 pero el orquestador lo lee
  // para decidir si Next está habilitado).
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');

  // Error tipado del backend a mostrar como banner.
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
        selectedPlan: persisted.selectedPlan ?? initialPlan,
        step: Math.max(persisted.step, stepFromServer) as OnboardingStep,
      });
    } else {
      // Sin draft válido: arrancamos en el paso que diga el server.
      setDraft({
        ...emptyDraft(locale, initialPlan),
        step: stepFromApiState(initialState),
      });
    }
    setHydrated(true);
  }, [initialPlan, initialState, locale]);

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

  const { isMutating, createProvider, createFirstService, finalizePlan } = useOnboardingMutations({
    draft,
    setDraft,
    locale,
    providerId,
    setProviderId,
    setSlugStatus,
    setStepError,
    onComplete,
  });

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
      goToStep(6);
      return;
    }
    if (draft.step === 6) {
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
