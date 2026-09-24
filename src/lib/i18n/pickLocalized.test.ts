import { describe, it, expect } from 'vitest';

import type { LocalizedText } from '@/types/domain';

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

  it('cae al primer idioma disponible si falta el castellano (dato antiguo)', () => {
    // Fila creada antes del guardián de escritura: solo alemán. El
    // comportamiento anterior (`text.es ?? ''`) devolvía string vacío y
    // el servicio salía sin nombre en TODAS las pantallas.
    const soloAleman = { de: 'Haarschnitt' } as unknown as LocalizedText;
    expect(pickLocalized(soloAleman, 'de')).toBe('Haarschnitt');
    expect(pickLocalized(soloAleman, 'es')).toBe('Haarschnitt');
    expect(pickLocalized(soloAleman, 'en')).toBe('Haarschnitt');

    // Orden de preferencia del fallback: es → ca → en → de.
    const sinCastellano = { ca: 'Tall', en: 'Haircut' } as unknown as LocalizedText;
    expect(pickLocalized(sinCastellano, 'de')).toBe('Tall');
  });

  it('devuelve string vacío solo si no hay texto en ningún idioma', () => {
    expect(pickLocalized({} as unknown as LocalizedText, 'es')).toBe('');
  });

  it('no devuelve fallback si el locale solicitado existe pero vacío', () => {
    // string vacío también es "no presente" — fallback al castellano.
    const partial = { es: 'Hola', ca: 'Hola', en: '', de: 'Hallo' } as const;
    expect(pickLocalized(partial, 'en')).toBe('Hola');
    expect(pickLocalized(partial, 'de')).toBe('Hallo');
  });
});
