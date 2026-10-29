/**
 * Tests de las reglas de navegación del paso «hazte profesional».
 *
 * Fijan a dónde va cada rol desde `/registro` con sesión, desde
 * `/hazte-profesional` y desde `/onboarding`: la causa del bug era que
 * un cliente acababa siempre en la portada sin forma de crear su negocio.
 */

import { describe, expect, it } from 'vitest';

import {
  BECOME_PROVIDER_PATH,
  buildBecomeProviderHref,
  resolveBecomeProviderPageRedirect,
  resolveOnboardingRedirect,
  resolveSignedInSignUpDestination,
} from './become-provider';

describe('buildBecomeProviderHref', () => {
  it('sin plan devuelve la ruta limpia', () => {
    expect(buildBecomeProviderHref()).toBe(BECOME_PROVIDER_PATH);
    expect(buildBecomeProviderHref(null)).toBe(BECOME_PROVIDER_PATH);
  });

  it('conserva el plan elegido', () => {
    expect(buildBecomeProviderHref('pro')).toBe('/hazte-profesional?plan=pro');
  });
});

describe('resolveSignedInSignUpDestination (/registro con sesión)', () => {
  it('cliente con intención de profesional → pantalla de conversión con su plan', () => {
    expect(resolveSignedInSignUpDestination('client', { role: 'provider', plan: 'premium' })).toBe(
      '/hazte-profesional?plan=premium',
    );
  });

  it('cliente con intención de profesional sin plan → pantalla de conversión', () => {
    expect(resolveSignedInSignUpDestination('client', { role: 'provider' }, '/buscar')).toBe(
      '/hazte-profesional',
    );
  });

  it('cliente sin intención de profesional → su redirect_url o la portada', () => {
    expect(resolveSignedInSignUpDestination('client', {}, '/centro/x-1')).toBe('/centro/x-1');
    expect(resolveSignedInSignUpDestination('client', { role: 'client' })).toBe('/');
  });

  it('profesional → su panel aunque llegue con ?as=provider', () => {
    expect(resolveSignedInSignUpDestination('provider', { role: 'provider', plan: 'pro' })).toBe(
      '/panel',
    );
  });

  it('admin → su panel, nunca la conversión', () => {
    expect(resolveSignedInSignUpDestination('admin', { role: 'provider' })).toBe('/admin');
  });
});

describe('resolveBecomeProviderPageRedirect (/hazte-profesional)', () => {
  it('cliente ve la pantalla', () => {
    expect(resolveBecomeProviderPageRedirect('client')).toBeNull();
  });

  it('profesional va al onboarding', () => {
    expect(resolveBecomeProviderPageRedirect('provider')).toBe('/onboarding');
  });

  it('admin va a su panel', () => {
    expect(resolveBecomeProviderPageRedirect('admin')).toBe('/admin');
  });
});

describe('resolveOnboardingRedirect (/onboarding)', () => {
  it('profesional ve el wizard', () => {
    expect(resolveOnboardingRedirect('provider')).toBeNull();
  });

  it('cliente va a la pantalla de conversión en vez de a la portada', () => {
    expect(resolveOnboardingRedirect('client')).toBe('/hazte-profesional');
  });

  it('admin va a su panel', () => {
    expect(resolveOnboardingRedirect('admin')).toBe('/admin');
  });
});
