import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { TeamOverview } from '@/lib/services/team';
import es from '@/messages/es.json';

import { TeamList } from './TeamList';

const messages = { providerPanel: { team: es.providerPanel.team } };

function renderList(overview: TeamOverview) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <TeamList overview={overview} locale="es" />
    </NextIntlClientProvider>,
  );
}

const BASE: TeamOverview = {
  members: [
    { id: 'a', name: 'Ana', photo: null, status: 'active', serviceCount: 2 },
    { id: 'b', name: 'Bea', photo: null, status: 'outOfPlan', serviceCount: 1 },
    { id: 'c', name: 'Carla', photo: null, status: 'inactive', serviceCount: 0 },
  ],
  activeCount: 2,
  maxProfessionals: 1,
  unstaffedServices: [],
};

describe('TeamList', () => {
  it('pinta cada profesional con su estado, servicios y enlace a su ficha', () => {
    renderList(BASE);

    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]!).getByText('Activo')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('2 servicios')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Fuera de tu plan')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('De baja')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Sin servicios')).toBeInTheDocument();
    expect(within(rows[0]!).getByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      expect.stringContaining('/panel/equipo/a'),
    );
  });

  it('muestra el contador del plan y, fuera de plan, el aviso con enlace a mejorarlo', () => {
    renderList(BASE);

    expect(screen.getByText('2 de 1 profesionales de tu plan')).toBeInTheDocument();
    const notice = screen.getByRole('status');
    expect(within(notice).getByText(/fuera de tu plan/)).toBeInTheDocument();
    expect(within(notice).getByRole('link', { name: /Mejora tu plan/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/panel/plan'),
    );
    // Plan lleno: no se ofrece añadir.
    expect(screen.queryByRole('link', { name: /Añadir profesional/ })).not.toBeInTheDocument();
  });

  it('con cupo libre ofrece añadir y no muestra aviso', () => {
    renderList({
      ...BASE,
      members: [BASE.members[0]!],
      activeCount: 1,
      maxProfessionals: null,
    });

    expect(screen.getByText('1 profesionales · Sin límite')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Añadir profesional/ })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('avisa de los servicios que nadie puede atender', () => {
    renderList({ ...BASE, unstaffedServices: [{ id: 's1', name: { es: 'Tinte' } }] });

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Tinte')).toBeInTheDocument();
  });
});
