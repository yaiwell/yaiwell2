'use client';

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/navigation';

import { OnboardingProgress } from '../OnboardingProgress';
import {
  BusinessDataStep,
  BusinessTypeStep,
  CategoriesServiceStep,
  ConfirmStep,
  LocationStep,
} from '../steps';

import { useOnboardingWizard } from './OnboardingWizard.logic';
import { onboardingWizardStyles as s } from './OnboardingWizard.styles';
import type { OnboardingWizardProps } from './OnboardingWizard.types';

/**
 * Orquestador del wizard de onboarding.
 *
 * Render contitional por paso: solo monta el step activo para evitar
 * que los demás disparen efectos (debounce de slug, requests fantasma).
 *
 * El header pinta el `OnboardingProgress` y el footer aloja los CTAs
 * Back/Next. Errores tipados del backend se muestran como banner
 * encima del cuerpo del paso.
 */
export function OnboardingWizard(props: OnboardingWizardProps) {
  const { initialState, categoriesPreloaded, locale, userPending } = props;
  const t = useTranslations('onboarding');
  const tCommon = useTranslations('onboarding.common');
  const tErrors = useTranslations('onboarding.errors');
  const tSyncing = useTranslations('onboarding.syncing');
  const router = useRouter();

  const {
    draft,
    hydrated,
    syncing,
    slugStatus,
    setSlugStatus,
    stepError,
    isMutating,
    ready,
    totalSteps,
    updateDraft,
    handleNext,
    handleBack,
  } = useOnboardingWizard({
    initialState,
    locale,
    userPending,
    onComplete: () => router.push('/panel'),
  });

  // Pantalla de "syncing…" si el usuario aún no llegó por webhook de Clerk.
  if (syncing) {
    return (
      <div className={s.root}>
        <div className={s.syncingCard} role="status" aria-live="polite">
          <span className={s.syncingSpinner} aria-hidden>
            <Loader2 className="size-5" />
          </span>
          <h2 className={s.syncingTitle}>{tSyncing('title')}</h2>
          <p className={s.syncingSubtitle}>{tSyncing('subtitle')}</p>
        </div>
      </div>
    );
  }

  // Antes de hidratar el draft mostramos un placeholder mínimo para no
  // pintar el paso con valores por defecto y producir saltos visuales.
  if (!hydrated) {
    return (
      <div className={s.root}>
        <div className={s.syncingCard} role="status" aria-live="polite">
          <span className={s.syncingSpinner} aria-hidden>
            <Loader2 className="size-5" />
          </span>
        </div>
      </div>
    );
  }

  // Traducción del error si conocemos su código; si no, fallback al
  // mensaje crudo del backend.
  const errorMessage = (() => {
    if (!stepError) return null;
    const knownCodes = [
      'UNAUTHORIZED',
      'USER_NOT_SYNCED',
      'INVALID_BODY',
      'SLUG_ALREADY_TAKEN',
      'ONBOARDING_ALREADY_COMPLETE',
      'PROVIDER_FOR_ONBOARDING_NOT_FOUND',
      'CATEGORY_NOT_FOUND',
      'PLAN_TIER_NOT_FOUND',
      'FREE_PLAN_NOT_SEEDED',
      'INTERNAL',
      'NETWORK',
    ] as const;
    type KnownCode = (typeof knownCodes)[number];
    const isKnown = (knownCodes as readonly string[]).includes(stepError.code);
    if (isKnown) return tErrors(stepError.code as KnownCode);
    return stepError.message ?? tErrors('INTERNAL');
  })();

  // Etiquetas dinámicas del CTA principal.
  const nextLabel = (() => {
    if (isMutating) return tCommon('saving');
    if (draft.step === 5) return tCommon('publishCta');
    return tCommon('next');
  })();

  return (
    <div className={s.root}>
      <div className={s.shell}>
        <header className={s.header}>
          <span className={s.eyebrow}>{t('badge')}</span>
          <OnboardingProgress current={draft.step} total={totalSteps} />
        </header>

        {errorMessage && (
          <div className={s.errorBanner} role="alert">
            {errorMessage}
          </div>
        )}

        <div className={s.body}>
          {draft.step === 1 && (
            <BusinessTypeStep
              value={draft.businessType}
              onChange={(businessType) => updateDraft({ businessType })}
            />
          )}
          {draft.step === 2 && (
            <BusinessDataStep
              value={{
                businessName: draft.businessName ?? '',
                slug: draft.slug ?? '',
                vatNumber: draft.vatNumber ?? '',
                description: draft.description ?? '',
                priceRange: draft.priceRange,
              }}
              onChange={(patch) => updateDraft(patch)}
              slugStatus={slugStatus}
              onSlugStatusChange={setSlugStatus}
              externalError={
                stepError?.code === 'SLUG_ALREADY_TAKEN' ? tErrors('SLUG_ALREADY_TAKEN') : undefined
              }
            />
          )}
          {draft.step === 3 && (
            <LocationStep
              value={{
                address: draft.address ?? '',
                lat: draft.lat,
                lng: draft.lng,
              }}
              onChange={(patch) => updateDraft(patch)}
              locale={locale}
            />
          )}
          {draft.step === 4 && (
            <CategoriesServiceStep
              value={{
                categoryId: draft.categoryId,
                serviceName: draft.serviceName ?? '',
                serviceDescription: draft.serviceDescription ?? '',
                serviceDurationMinutes: draft.serviceDurationMinutes ?? 30,
                servicePriceEuros: draft.servicePriceEuros ?? 0,
              }}
              onChange={(patch) => updateDraft(patch)}
              categories={categoriesPreloaded}
              locale={locale}
            />
          )}
          {draft.step === 5 && (
            <ConfirmStep
              summary={{
                type: draft.businessType ?? 'autonomo',
                businessName: draft.businessName ?? '',
                slug: draft.slug ?? '',
                vatNumber: draft.vatNumber,
                description: draft.description ?? '',
                priceRange: draft.priceRange ?? '€',
                address: draft.address ?? '',
                categoryId: draft.categoryId ?? '',
                serviceName: draft.serviceName ?? '',
                serviceDurationMinutes: draft.serviceDurationMinutes ?? 30,
                servicePriceEuros: draft.servicePriceEuros ?? 0,
              }}
              categories={categoriesPreloaded}
              locale={locale}
              termsAccepted={draft.termsAccepted === true}
              onTermsChange={(termsAccepted) => updateDraft({ termsAccepted })}
            />
          )}
        </div>

        <footer className={s.footer}>
          <div className={s.footerLeft}>
            <button
              type="button"
              className={s.backButton}
              onClick={handleBack}
              disabled={draft.step === 1 || isMutating}
            >
              <ArrowLeft className="size-4" aria-hidden />
              {tCommon('back')}
            </button>
          </div>
          <div className={s.footerRight}>
            <button
              type="button"
              className={s.primaryButton}
              onClick={() => void handleNext()}
              disabled={!ready || isMutating}
              data-testid="onboarding-next"
            >
              {nextLabel}
              {!isMutating && draft.step < 5 && <ArrowRight className="size-4" aria-hidden />}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
