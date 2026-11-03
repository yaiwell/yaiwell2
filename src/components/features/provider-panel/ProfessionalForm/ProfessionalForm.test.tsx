import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WeeklySchedule } from '@/lib/services/availability';
import es from '@/messages/es.json';

const actions = vi.hoisted(() => ({
  createProfessionalAction: vi.fn(),
  updateProfessionalAction: vi.fn(),
  deactivateProfessionalAction: vi.fn(),
  reactivateProfessionalAction: vi.fn(),
}));

// Las actions importan `server-only` y Prisma: fuera del test.
vi.mock('@/app/[locale]/panel/equipo/actions', () => actions);
vi.mock('@/components/shared/PhotoUploader', () => ({
  PhotoUploader: () => <div data-component="photo-uploader-stub" />,
}));

import { ProfessionalForm } from './ProfessionalForm';
import type { ProfessionalFormProps } from './ProfessionalForm.types';

const messages = {
  providerPanel: {
    team: es.providerPanel.team,
    settings: { schedule: es.providerPanel.settings.schedule },
  },
};

const SCHEDULE: WeeklySchedule = {
  monday: [{ open: '09:00', close: '18:00' }],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

const SERVICES = [
  { id: 's1', name: { es: 'Corte' } },
  { id: 's2', name: { es: 'Tinte' } },
];

function renderForm(props: Partial<ProfessionalFormProps> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <ProfessionalForm
        locale="es"
        providerId="prov-1"
        services={SERVICES}
        defaultSchedule={SCHEDULE}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

const EXISTING = {
  id: 'pro-1',
  name: 'Laura',
  bio: null,
  photo: null,
  schedule: SCHEDULE,
  serviceIds: ['s1'],
  status: 'active' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  actions.createProfessionalAction.mockResolvedValue({ ok: true });
  actions.updateProfessionalAction.mockResolvedValue({ ok: true });
});

describe('ProfessionalForm — alta', () => {
  it('envía nombre, presentación, horario y servicios marcados', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Nombre'), 'Marta');
    await user.type(screen.getByLabelText('Presentación (opcional)'), 'Color');
    await user.click(screen.getByRole('checkbox', { name: 'Tinte' }));
    await user.click(screen.getByRole('button', { name: 'Añadir al equipo' }));

    await waitFor(() => expect(actions.createProfessionalAction).toHaveBeenCalledOnce());
    expect(actions.createProfessionalAction).toHaveBeenCalledWith('es', {
      name: 'Marta',
      bio: 'Color',
      photo: null,
      schedule: SCHEDULE,
      serviceIds: ['s2'],
    });
  });

  it('muestra el aviso del límite del plan', async () => {
    const user = userEvent.setup();
    actions.createProfessionalAction.mockResolvedValue({ ok: false, code: 'PLAN_LIMIT' });
    renderForm();

    await user.type(screen.getByLabelText('Nombre'), 'Marta');
    await user.click(screen.getByRole('button', { name: 'Añadir al equipo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/máximo de profesionales/);
  });
});

describe('ProfessionalForm — edición', () => {
  it('lista los servicios que se quedarían sin nadie', async () => {
    const user = userEvent.setup();
    actions.updateProfessionalAction.mockResolvedValue({
      ok: false,
      code: 'UNSTAFFED_SERVICES',
      services: [{ id: 's1', name: { es: 'Corte' } }],
    });
    renderForm({ professional: EXISTING });

    await user.click(screen.getByRole('checkbox', { name: 'Corte' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Corte')).toBeInTheDocument();
    expect(actions.updateProfessionalAction).toHaveBeenCalledWith(
      'es',
      'pro-1',
      expect.objectContaining({ serviceIds: [] }),
    );
  });

  it('la baja con citas futuras las lista y no deja confirmar', async () => {
    const user = userEvent.setup();
    renderForm({
      professional: EXISTING,
      blockingBookings: [
        { id: 'bk-1', startAt: '2026-11-05T09:00:00.000Z', serviceName: { es: 'Corte' } },
      ],
    });

    await user.click(screen.getByRole('button', { name: /Dar de baja/ }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/cancelar sus citas futuras/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Corte/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Dar de baja' })).toBeDisabled();
    expect(actions.deactivateProfessionalAction).not.toHaveBeenCalled();
  });

  it('sin citas, confirma la baja', async () => {
    const user = userEvent.setup();
    actions.deactivateProfessionalAction.mockResolvedValue({ ok: true });
    renderForm({ professional: EXISTING });

    await user.click(screen.getByRole('button', { name: /Dar de baja/ }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }));

    await waitFor(() =>
      expect(actions.deactivateProfessionalAction).toHaveBeenCalledWith('es', 'pro-1'),
    );
  });

  it('de baja: el formulario queda bloqueado y se ofrece reactivar', async () => {
    const user = userEvent.setup();
    actions.reactivateProfessionalAction.mockResolvedValue({ ok: false, code: 'PLAN_LIMIT' });
    renderForm({ professional: { ...EXISTING, status: 'inactive' } });

    expect(screen.getByLabelText('Nombre')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reactivar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/máximo de profesionales/);
  });
});
