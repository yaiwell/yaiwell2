/**
 * Paridad de los mensajes de la web: los 5 idiomas tienen las mismas claves
 * que el castellano. En francés, además, ningún apóstrofo recto: en ICU `'{`
 * abre un literal y la variable dejaría de sustituirse.
 */
import { describe, expect, it } from 'vitest';

import ca from './ca.json';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';

/** Rutas de todas las hojas de un objeto de mensajes. */
function leaves(value: unknown, prefix = ''): [string, string][] {
  if (typeof value === 'string') return [[prefix, value]];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

const paths = (messages: unknown) =>
  leaves(messages)
    .map(([path]) => path)
    .sort();

describe('mensajes de la web', () => {
  it.each([
    ['ca', ca],
    ['en', en],
    ['de', de],
    ['fr', fr],
  ])('%s tiene las mismas claves que es', (_locale, messages) => {
    expect(paths(messages)).toEqual(paths(es));
  });

  it('el francés usa apóstrofo tipográfico', () => {
    expect(leaves(fr).filter(([, text]) => text.includes("'"))).toEqual([]);
  });
});
