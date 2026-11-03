import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import type { PublicProfessional } from '@/types/domain';

import { ProfessionalPicker } from './ProfessionalPicker';
import { findProfessional, shouldShowProfessionalPicker } from './ProfessionalPicker.logic';

/**
 * Tests del selector de profesional (CLAUDE.md §4.bis «Equipo»):
 * «Cualquiera disponible» por defecto, oculto con un solo profesional y
 * elección accesible como grupo de radios.
 */

const messages = {
  booking: {
    summary: { anyProfessional: 'Cualquier profesional disponible' },
    professionalPicker: {
      legend: '¿Quién quieres que te atienda?',
      anyHint: 'Te asignamos a quien esté libre.',
    },
  },
};

const LAIA: PublicProfessional = {
  id: 'pro-1',
  name: 'Laia Vidal',
  photo: 'https://example.com/laia.jpg',
  bio: null,
};
const MARC: PublicProfessional = { id: 'pro-2', name: 'Marc Soler', photo: null, bio: null };

function renderPicker(
  professionals: PublicProfessional[],
  value: string | null = null,
  onChange = vi.fn(),
) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ProfessionalPicker professionals={professionals} value={value} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return { onChange };
}

describe('ProfessionalPicker', () => {
  it('marca «Cualquier profesional disponible» por defecto', () => {
    renderPicker([LAIA, MARC]);

    const group = screen.getByRole('group', { name: '¿Quién quieres que te atienda?' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Cualquier profesional disponible' })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Laia Vidal/ })).not.toBeChecked();
    // Sin foto: iniciales en el avatar.
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('no se pinta con un solo profesional', () => {
    renderPicker([LAIA]);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('elegir un profesional y volver a «cualquiera» avisa al flujo', async () => {
    const { onChange } = renderPicker([LAIA, MARC], 'pro-2');
    expect(screen.getByRole('radio', { name: /Marc Soler/ })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: /Laia Vidal/ }));
    expect(onChange).toHaveBeenLastCalledWith('pro-1');

    await userEvent.click(screen.getByRole('radio', { name: 'Cualquier profesional disponible' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('ProfessionalPicker.logic', () => {
  it('solo se enseña con más de un profesional', () => {
    expect(shouldShowProfessionalPicker([])).toBe(false);
    expect(shouldShowProfessionalPicker([LAIA])).toBe(false);
    expect(shouldShowProfessionalPicker([LAIA, MARC])).toBe(true);
  });

  it('findProfessional resuelve por id', () => {
    expect(findProfessional('pro-1', [LAIA, MARC])).toBe(LAIA);
    expect(findProfessional(null, [LAIA])).toBeNull();
    expect(findProfessional('x', [LAIA])).toBeNull();
  });
});
