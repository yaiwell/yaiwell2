/**
 * Tests del schema compartido de textos localizados.
 *
 * Es la segunda línea de defensa (la primera es el tipo marcado
 * `StorableLocalizedText`): aunque un payload llegue por HTTP saltándose
 * los constructores, sin `es` no entra.
 */

import { describe, expect, it } from 'vitest';

import { localizedTextPatchSchema, storableLocalizedTextSchema } from './localized-text';

describe('storableLocalizedTextSchema', () => {
  it('acepta un texto con castellano', () => {
    const parsed = storableLocalizedTextSchema.parse({ es: 'Corte', de: 'Haarschnitt' });
    expect(parsed).toEqual({ es: 'Corte', de: 'Haarschnitt' });
  });

  it('rechaza un texto sin castellano aunque traiga otros idiomas', () => {
    const result = storableLocalizedTextSchema.safeParse({ de: 'Haarschnitt', ca: 'Tall' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['es']);
    expect(result.error?.issues[0]?.message).toContain('castellano');
  });

  it('rechaza un castellano vacío o solo con espacios', () => {
    expect(storableLocalizedTextSchema.safeParse({ es: '' }).success).toBe(false);
    expect(storableLocalizedTextSchema.safeParse({ es: '   ' }).success).toBe(false);
  });

  it('recorta los espacios de todos los idiomas', () => {
    expect(storableLocalizedTextSchema.parse({ es: ' Corte ', ca: ' Tall ' })).toEqual({
      es: 'Corte',
      ca: 'Tall',
    });
  });
});

describe('localizedTextPatchSchema', () => {
  it('acepta un parche de un solo idioma (se fusiona después)', () => {
    expect(localizedTextPatchSchema.parse({ de: 'Haarschnitt' })).toEqual({ de: 'Haarschnitt' });
  });

  it('acepta el parche vacío (el usuario no tocó el campo)', () => {
    expect(localizedTextPatchSchema.parse({})).toEqual({});
  });
});
