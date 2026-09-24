/**
 * Tests del guardián de castellano en los textos localizados.
 *
 * El caso que motiva todo esto: un proveedor con el panel en alemán
 * creaba un servicio y el registro nacía sin clave `es`, lo que dejaba
 * el nombre en blanco en la ficha pública, el buscador y la reserva.
 */

import { describe, expect, it } from 'vitest';

import {
  buildLocalizedText,
  ensureSpanish,
  ensureSpanishIfAny,
  hasSpanish,
  mergeLocalizedText,
} from './localizedText';
import { EmptyLocalizedTextError } from './localizedText.errors';

describe('buildLocalizedText', () => {
  it('duplica en es el texto escrito en alemán', () => {
    expect(buildLocalizedText('de', 'Haarschnitt')).toEqual({
      es: 'Haarschnitt',
      de: 'Haarschnitt',
    });
  });

  it('duplica en es el texto escrito en catalán y en inglés', () => {
    expect(buildLocalizedText('ca', 'Tall de cabell')).toEqual({
      es: 'Tall de cabell',
      ca: 'Tall de cabell',
    });
    expect(buildLocalizedText('en', 'Haircut')).toEqual({ es: 'Haircut', en: 'Haircut' });
  });

  it('no duplica cuando ya se escribe en castellano', () => {
    expect(buildLocalizedText('es', 'Corte de pelo')).toEqual({ es: 'Corte de pelo' });
  });

  it('recorta espacios', () => {
    expect(buildLocalizedText('de', '  Haarschnitt  ')).toEqual({
      es: 'Haarschnitt',
      de: 'Haarschnitt',
    });
  });

  it('rechaza el texto vacío con un error tipado', () => {
    expect(() => buildLocalizedText('de', '   ')).toThrow(EmptyLocalizedTextError);
  });
});

describe('mergeLocalizedText', () => {
  it('no pierde los idiomas que no se tocaron', () => {
    const existing = { es: 'Corte', ca: 'Tall', en: 'Haircut' };
    expect(mergeLocalizedText(existing, 'en', 'Hair cut')).toEqual({
      es: 'Corte',
      ca: 'Tall',
      en: 'Hair cut',
    });
  });

  it('rellena es si el registro venía sin castellano (dato antiguo)', () => {
    expect(mergeLocalizedText({ de: 'Haarschnitt' }, 'de', 'Haarschnitt XL')).toEqual({
      es: 'Haarschnitt XL',
      de: 'Haarschnitt XL',
    });
  });

  it('arrastra el castellano cuando era un duplicado espejo del idioma editado', () => {
    // Servicio creado con el panel en alemán: es === de.
    const existing = buildLocalizedText('de', 'Haarschnitt');
    expect(mergeLocalizedText(existing, 'de', 'Haarschnitt XL')).toEqual({
      es: 'Haarschnitt XL',
      de: 'Haarschnitt XL',
    });
  });

  it('no pisa un castellano que sí es traducción propia', () => {
    const existing = { es: 'Corte de pelo', de: 'Haarschnitt' };
    expect(mergeLocalizedText(existing, 'de', 'Haarschnitt XL')).toEqual({
      es: 'Corte de pelo',
      de: 'Haarschnitt XL',
    });
  });

  it('descarta claves vacías del registro previo', () => {
    expect(mergeLocalizedText({ es: '', ca: '  ', en: 'Haircut' }, 'en', 'Hair cut')).toEqual({
      es: 'Hair cut',
      en: 'Hair cut',
    });
  });

  it('rechaza el texto vacío', () => {
    expect(() => mergeLocalizedText({ es: 'Corte' }, 'ca', '')).toThrow(EmptyLocalizedTextError);
  });
});

describe('ensureSpanish', () => {
  it('devuelve el texto tal cual si ya tiene castellano', () => {
    expect(ensureSpanish({ es: 'Corte', de: 'Haarschnitt' })).toEqual({
      es: 'Corte',
      de: 'Haarschnitt',
    });
  });

  it('rellena desde ca, luego en, luego de', () => {
    expect(ensureSpanish({ ca: 'Tall', en: 'Haircut' })).toEqual({
      es: 'Tall',
      ca: 'Tall',
      en: 'Haircut',
    });
    expect(ensureSpanish({ en: 'Haircut', de: 'Haarschnitt' })).toEqual({
      es: 'Haircut',
      en: 'Haircut',
      de: 'Haarschnitt',
    });
    expect(ensureSpanish({ de: 'Haarschnitt' })).toEqual({
      es: 'Haarschnitt',
      de: 'Haarschnitt',
    });
  });

  it('lanza si no hay texto en ningún idioma', () => {
    expect(() => ensureSpanish({})).toThrow(EmptyLocalizedTextError);
    expect(() => ensureSpanish(null)).toThrow(EmptyLocalizedTextError);
  });
});

describe('ensureSpanishIfAny', () => {
  it('acepta el vacío sin lanzar (campo opcional como description)', () => {
    expect(ensureSpanishIfAny({})).toEqual({});
    expect(ensureSpanishIfAny(undefined)).toEqual({});
  });

  it('cura el castellano si hay algo que copiar', () => {
    expect(ensureSpanishIfAny({ de: 'Lange Beschreibung' })).toEqual({
      es: 'Lange Beschreibung',
      de: 'Lange Beschreibung',
    });
  });
});

describe('hasSpanish', () => {
  it('distingue ausente, vacío y presente', () => {
    expect(hasSpanish(undefined)).toBe(false);
    expect(hasSpanish({})).toBe(false);
    expect(hasSpanish({ es: '   ' })).toBe(false);
    expect(hasSpanish({ es: 'Corte' })).toBe(true);
  });
});
