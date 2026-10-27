import { describe, expect, it } from 'vitest';

import { prepareGoogleSignUp } from './SignUpForm.google';
import type { SignUpDraft } from './SignUpForm.types';

const draft: SignUpDraft = {
  fullName: '',
  businessName: '',
  email: '',
  password: '',
  passwordRepeat: '',
  acceptsTerms: true,
};

describe('prepareGoogleSignUp', () => {
  it('un cliente solo necesita aceptar las condiciones', () => {
    expect(prepareGoogleSignUp('client', draft)).toEqual({
      ok: true,
      params: { unsafeMetadata: { role: 'client' } },
    });
  });

  it('exige aceptar las condiciones', () => {
    expect(prepareGoogleSignUp('client', { ...draft, acceptsTerms: false })).toEqual({
      ok: false,
      errors: { acceptsTerms: 'termsRequired' },
    });
  });

  it('un profesional necesita el nombre del negocio', () => {
    expect(prepareGoogleSignUp('provider', { ...draft, businessName: ' ' })).toEqual({
      ok: false,
      errors: { businessName: 'businessNameRequired' },
    });
  });

  it('el profesional lleva negocio y plan elegido; el cliente nunca el plan', () => {
    expect(
      prepareGoogleSignUp('provider', { ...draft, businessName: ' Studio Luz ' }, 'pro'),
    ).toEqual({
      ok: true,
      params: {
        unsafeMetadata: { role: 'provider', businessName: 'Studio Luz', selectedPlan: 'pro' },
      },
    });
    expect(prepareGoogleSignUp('client', draft, 'pro')).toEqual({
      ok: true,
      params: { unsafeMetadata: { role: 'client' } },
    });
  });
});
