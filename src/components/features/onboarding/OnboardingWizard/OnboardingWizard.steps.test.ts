import { describe, expect, it } from 'vitest';

import { emptyDraft, isStepReady, stepFromApiState } from './OnboardingWizard.steps';

describe('pasos del wizard', () => {
  it('el draft inicial lleva el plan preseleccionado', () => {
    expect(emptyDraft('es', 'pro')).toMatchObject({ step: 1, locale: 'es', selectedPlan: 'pro' });
  });

  it('un alta completada cae en el último paso (6)', () => {
    expect(
      stepFromApiState({
        providerId: 'p',
        step: 'completed',
        hasPhotos: true,
        hasFirstService: true,
        planTier: 'free',
      }),
    ).toBe(6);
  });

  it('el paso 5 exige un plan del catálogo', () => {
    const draft = emptyDraft('es', 'basic');
    expect(isStepReady(5, draft, 'idle')).toBe(true);
    expect(isStepReady(5, { ...draft, selectedPlan: undefined }, 'idle')).toBe(false);
  });

  it('el paso 6 exige aceptar los términos', () => {
    const draft = emptyDraft('es', 'free');
    expect(isStepReady(6, draft, 'idle')).toBe(false);
    expect(isStepReady(6, { ...draft, termsAccepted: true }, 'idle')).toBe(true);
  });
});
