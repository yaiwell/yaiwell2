import { describe, expect, it } from 'vitest';

import { parseSlotParam } from './slot-param';

describe('parseSlotParam', () => {
  it('acepta un ISO en UTC y lo devuelve normalizado', () => {
    expect(parseSlotParam('2026-10-28T16:00:00Z')).toBe('2026-10-28T16:00:00.000Z');
  });

  it('acepta un ISO con offset y lo pasa a UTC', () => {
    expect(parseSlotParam('2026-10-28T17:00:00+01:00')).toBe('2026-10-28T16:00:00.000Z');
  });

  it('toma el primer valor si llega repetido', () => {
    expect(parseSlotParam(['2026-10-28T16:00:00.000Z', 'basura'])).toBe('2026-10-28T16:00:00.000Z');
  });

  it.each([undefined, '', 'mañana', '2026-10-28', '2026-10-28T17:00:00', '17:00'])(
    'ignora el valor inválido %s',
    (raw) => {
      expect(parseSlotParam(raw)).toBeNull();
    },
  );
});
