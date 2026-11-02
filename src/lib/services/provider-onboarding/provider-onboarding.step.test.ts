import { describe, expect, it } from 'vitest';

import { nextOnboardingStep } from './provider-onboarding.step';

describe('nextOnboardingStep', () => {
  it('con negocio y servicio el alta está completada, tenga o no fotos', () => {
    // Regresión: un negocio aprobado con servicios pero sin fotos volvía
    // al paso 3 (ubicación) con el formulario vacío.
    expect(nextOnboardingStep(true)).toBe('completed');
  });

  it('con negocio y sin servicio toca el paso 4 (primer servicio), no el 3', () => {
    expect(nextOnboardingStep(false)).toBe(4);
  });
});
