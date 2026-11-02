import { describe, expect, it } from 'vitest';

import { emptyDraft, isStepReady, resumeStep, stepFromApiState } from './OnboardingWizard.steps';

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

  describe('resumeStep', () => {
    const noProvider = {
      providerId: null,
      step: 1 as const,
      hasPhotos: false,
      hasFirstService: false,
      planTier: null,
    };
    const filled = {
      ...emptyDraft('es', 'free'),
      businessType: 'centro' as const,
      businessName: 'Studio',
      slug: 'studio',
      description: 'Un estudio',
      priceRange: '€€' as const,
    };

    it('sin negocio, un borrador en el paso 3 con pasos vacíos vuelve al primero incompleto', () => {
      expect(resumeStep({ ...emptyDraft('es', 'free'), step: 3 }, noProvider)).toBe(1);
      expect(
        resumeStep({ ...emptyDraft('es', 'free'), step: 3, businessType: 'centro' }, noProvider),
      ).toBe(2);
    });

    it('sin negocio, con los pasos 1 y 2 completos se retoma en el 3', () => {
      expect(resumeStep({ ...filled, step: 3 }, noProvider)).toBe(3);
    });

    it('con negocio creado nunca vuelve antes del paso 4', () => {
      const withProvider = { ...noProvider, providerId: 'p', step: 4 as const };
      expect(resumeStep({ ...emptyDraft('es', 'free'), step: 1 }, withProvider)).toBe(4);
      expect(resumeStep({ ...filled, step: 5 }, withProvider)).toBe(5);
    });
  });
});
