import { describe, expect, it } from 'vitest';

import { filterByProfessional, resolveProfessionalFilter } from './panel-professional-filter';

const TEAM = [
  { id: 'pro-ana', name: 'Ana' },
  { id: 'pro-luis', name: 'Luis' },
];

describe('resolveProfessionalFilter', () => {
  it('acepta un profesional del equipo', () => {
    expect(resolveProfessionalFilter('pro-luis', TEAM)).toBe('pro-luis');
  });

  it('ignora ids ajenos, repetidos o ausentes (se ve todo el equipo)', () => {
    expect(resolveProfessionalFilter('pro-otro-negocio', TEAM)).toBeNull();
    expect(resolveProfessionalFilter(['pro-ana', 'pro-luis'], TEAM)).toBeNull();
    expect(resolveProfessionalFilter(undefined, TEAM)).toBeNull();
  });

  it('con un solo profesional no hay filtro', () => {
    expect(resolveProfessionalFilter('pro-ana', [TEAM[0]])).toBeNull();
  });
});

describe('filterByProfessional', () => {
  const items = [
    { id: 1, professionalId: 'pro-ana' },
    { id: 2, professionalId: 'pro-luis' },
    { id: 3, professionalId: null },
  ];

  it('sin filtro devuelve todo', () => {
    expect(filterByProfessional(items, null)).toBe(items);
  });

  it('deja solo lo del profesional elegido', () => {
    expect(filterByProfessional(items, 'pro-luis').map((i) => i.id)).toEqual([2]);
  });
});
