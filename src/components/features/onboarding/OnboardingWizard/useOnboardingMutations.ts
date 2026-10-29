'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

import { startPlanCheckoutAction } from '@/app/[locale]/panel/plan/actions';
import type { AppLocale } from '@/i18n/routing';

import type { SlugStatus } from '../steps/BusinessDataStep';
import { apiCreateFirstService, apiCreateProvider, apiSelectPlan, clearDraft } from '../shared';
import type { OnboardingApiError, OnboardingDraft } from '../shared';

import { finalizeOnboarding } from './OnboardingWizard.finalize';

/**
 * Mutaciones del wizard contra el backend: crear el negocio (paso 3),
 * el primer servicio (paso 4) y publicar con el plan elegido (paso 6).
 *
 * Gestiona su propio `isMutating`; el error tipado y el resto del estado
 * los comparte con el orquestador a través de los setters recibidos.
 */
export function useOnboardingMutations(params: {
  draft: OnboardingDraft;
  setDraft: Dispatch<SetStateAction<OnboardingDraft>>;
  locale: AppLocale;
  providerId: string | null;
  setProviderId: (id: string) => void;
  setSlugStatus: (status: SlugStatus) => void;
  setStepError: (error: OnboardingApiError | null) => void;
  onComplete: (href: string) => void;
}) {
  const { draft, setDraft, locale, providerId, setProviderId, setSlugStatus, setStepError } =
    params;
  const { onComplete } = params;
  const [isMutating, setIsMutating] = useState(false);

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
  }, [draft, locale, setDraft, setProviderId, setSlugStatus, setStepError]);

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
  }, [draft, locale, providerId, setStepError]);

  /**
   * Dispatch del paso 6: publicar en Gratis y, si el plan elegido es de
   * pago, ir al Checkout (ver `finalizeOnboarding`).
   */
  const finalizePlan = useCallback(async (): Promise<boolean> => {
    if (!providerId) return false;
    setIsMutating(true);
    const outcome = await finalizeOnboarding(draft.selectedPlan ?? 'free', {
      selectFreePlan: () => apiSelectPlan(providerId, 'free'),
      startCheckout: (tier) => startPlanCheckoutAction(locale, tier),
    });
    if (outcome.kind === 'error') {
      setIsMutating(false);
      setStepError(outcome.error);
      return false;
    }
    clearDraft();
    if (outcome.kind === 'checkout') {
      // Dejamos `isMutating` activo: el botón sigue bloqueado hasta que
      // el navegador sale hacia Stripe.
      window.location.assign(outcome.url);
      return true;
    }
    setIsMutating(false);
    onComplete(outcome.href);
    return true;
  }, [draft.selectedPlan, locale, onComplete, providerId, setStepError]);

  return { isMutating, createProvider, createFirstService, finalizePlan };
}
