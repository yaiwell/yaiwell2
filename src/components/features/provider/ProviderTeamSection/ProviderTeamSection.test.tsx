import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { PublicProfessional } from '@/types/domain';

import { ProviderTeamSection } from './ProviderTeamSection';
import { shouldShowTeam } from './ProviderTeamSection.logic';

/**
 * Tests de la sección «El equipo» de la ficha (CLAUDE.md §4.bis «Equipo»).
 */

const messages = {
  providerDetail: {
    team: { title: 'El equipo', subtitle: 'Las personas que te atenderán.' },
  },
};

const LAIA: PublicProfessional = {
  id: 'pro-1',
  name: 'Laia Vidal',
  photo: 'https://example.com/laia.jpg',
  bio: 'Colorista con 10 años de oficio.',
};
const MARC: PublicProfessional = { id: 'pro-2', name: 'Marc Soler', photo: null, bio: null };

describe('shouldShowTeam', () => {
  it('se enseña con más de un profesional', () => {
    expect(shouldShowTeam([MARC, { ...MARC, id: 'pro-3' }])).toBe(true);
  });

  it('con uno solo, solo si tiene foto o bio', () => {
    expect(shouldShowTeam([MARC])).toBe(false);
    expect(shouldShowTeam([LAIA])).toBe(true);
    expect(shouldShowTeam([{ ...MARC, bio: 'Barbero.' }])).toBe(true);
    expect(shouldShowTeam([])).toBe(false);
  });
});

describe('ProviderTeamSection', () => {
  it('pinta nombre, bio, foto e iniciales de cada profesional', () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <ProviderTeamSection team={[LAIA, MARC]} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'El equipo' })).toHaveAttribute(
      'id',
      'provider-team-heading',
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('Laia Vidal')).toBeInTheDocument();
    expect(within(items[0]!).getByText('Colorista con 10 años de oficio.')).toBeInTheDocument();
    expect(items[0]!.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/laia.jpg',
    );
    // Sin foto: iniciales; sin bio: ningún párrafo vacío.
    expect(within(items[1]!).getByText('MS')).toBeInTheDocument();
    expect(items[1]!.querySelector('p')).toBeNull();
  });
});
