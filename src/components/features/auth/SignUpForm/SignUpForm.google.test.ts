import { describe, expect, it } from 'vitest';

import { prepareGoogleSignUp, resolveGoogleRedirectUrl } from './SignUpForm.google';
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

describe('resolveGoogleRedirectUrl', () => {
  it('en la pestaña de profesional vuelve a la pantalla de conversión con el plan', () => {
    // Si la cuenta de Google ya era de cliente, Clerk la transfiere a un
    // inicio de sesión: sin esto volvería a la portada como cliente.
    expect(resolveGoogleRedirectUrl('provider', 'pro', null)).toBe('/hazte-profesional?plan=pro');
    expect(resolveGoogleRedirectUrl('provider', undefined, '/centro/x-1')).toBe(
      '/hazte-profesional',
    );
  });

  it('en la pestaña de cliente respeta el redirect_url de origen', () => {
    expect(resolveGoogleRedirectUrl('client', 'pro', '/centro/x-1')).toBe('/centro/x-1');
    expect(resolveGoogleRedirectUrl('client', undefined, undefined)).toBeNull();
  });
});
