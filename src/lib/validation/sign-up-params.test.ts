/**
 * Tests de la validación de searchParams de `/registro`.
 *
 * Son datos de fuera (la URL): lo que importa es que un valor
 * inesperado se descarte en silencio y que `as=admin` jamás pase.
 */

import { describe, expect, it } from 'vitest';

import { parseSignUpIntent } from './sign-up-params';

describe('parseSignUpIntent', () => {
  it('acepta la combinación que emiten los CTAs de /profesionales', () => {
    expect(parseSignUpIntent({ as: 'provider', plan: 'pro' })).toEqual({
      role: 'provider',
      plan: 'pro',
    });
  });

  it('devuelve ambos campos vacíos cuando no hay parámetros', () => {
    expect(parseSignUpIntent({})).toEqual({ role: undefined, plan: undefined });
    expect(parseSignUpIntent(undefined)).toEqual({ role: undefined, plan: undefined });
  });

  it('descarta un rol no ofrecido por el formulario', () => {
    // Escalada de privilegios por URL: `admin` no es una opción.
    expect(parseSignUpIntent({ as: 'admin' }).role).toBeUndefined();
    expect(parseSignUpIntent({ as: '' }).role).toBeUndefined();
  });

  it('descarta un plan que no existe en el catálogo', () => {
    expect(parseSignUpIntent({ as: 'provider', plan: 'enterprise' })).toEqual({
      role: 'provider',
      plan: undefined,
    });
  });

  it('descarta parámetros repetidos, que Next entrega como array', () => {
    expect(parseSignUpIntent({ as: ['client', 'provider'], plan: ['pro'] })).toEqual({
      role: undefined,
      plan: undefined,
    });
  });

  it('ignora parámetros ajenos sin romper', () => {
    expect(parseSignUpIntent({ as: 'client', utm_source: 'newsletter' })).toEqual({
      role: 'client',
      plan: undefined,
    });
  });

  it('acepta los cuatro tiers del catálogo', () => {
    for (const tier of ['free', 'basic', 'pro', 'premium'] as const) {
      expect(parseSignUpIntent({ plan: tier }).plan).toBe(tier);
    }
  });
});
