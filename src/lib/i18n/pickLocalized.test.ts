import { describe, it, expect } from 'vitest';

import { pickLocalized } from './pickLocalized';

describe('pickLocalized', () => {
  const full = { es: 'Hola', ca: 'Hola', en: 'Hello', de: 'Hallo' } as const;
  const onlyRequired = { es: 'Hola', ca: 'Hola' } as const;

  it('devuelve la traducción del locale solicitado cuando existe', () => {
    expect(pickLocalized(full, 'es')).toBe('Hola');
    expect(pickLocalized(full, 'ca')).toBe('Hola');
    expect(pickLocalized(full, 'en')).toBe('Hello');
    expect(pickLocalized(full, 'de')).toBe('Hallo');
  });

  it('cae a castellano cuando falta la traducción inglesa', () => {
    expect(pickLocalized(onlyRequired, 'en')).toBe('Hola');
  });

  it('cae a castellano cuando falta la traducción alemana', () => {
    expect(pickLocalized(onlyRequired, 'de')).toBe('Hola');
  });

  it('no devuelve fallback si el locale solicitado existe pero vacío', () => {
    // string vacío también es "no presente" — fallback al castellano.
    const partial = { es: 'Hola', ca: 'Hola', en: '', de: 'Hallo' } as const;
    expect(pickLocalized(partial, 'en')).toBe('Hola');
    expect(pickLocalized(partial, 'de')).toBe('Hallo');
  });
});
