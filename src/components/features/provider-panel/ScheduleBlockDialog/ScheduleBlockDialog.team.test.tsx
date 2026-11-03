import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

// La action real arrastra Prisma y Clerk: aquí solo se comprueba qué se
// le envía y cómo se pinta su respuesta.
const createScheduleBlockActionMock = vi.fn();
vi.mock('@/app/[locale]/panel/calendario/schedule-blocks.actions', () => ({
  createScheduleBlockAction: (...args: unknown[]) => createScheduleBlockActionMock(...args),
  removeScheduleBlockAction: vi.fn(),
}));
const refreshMock = vi.fn();
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

import { ScheduleBlockDialog } from './index';
import { getFormIssue, toCreateInput } from './ScheduleBlockDialog.logic';
import { ALL_TEAM, getInitialTarget } from './ScheduleBlockDialog.team';

/** Martes 3 de noviembre de 2026, 10:20 en Madrid (CET, UTC+1). */
const NOW = new Date('2026-11-03T09:20:00.000Z');

const VALID = {
  startDateKey: '2026-11-04',
  startTime: '10:00',
  endDateKey: '2026-11-04',
  endTime: '12:00',
  reason: '',
};

const TEAM = [
  { id: 'pro-ana', name: 'Ana' },
  { id: 'pro-luis', name: 'Luis' },
];

describe('ScheduleBlockDialog.logic · equipo', () => {
  it('con un profesional elige el suyo; con equipo, el del filtro o nadie', () => {
    expect(getInitialTarget([TEAM[0]], null)).toBe('pro-ana');
    expect(getInitialTarget(TEAM, 'pro-luis')).toBe('pro-luis');
    expect(getInitialTarget(TEAM, 'pro-de-baja')).toBe('');
    expect(getInitialTarget(TEAM, null)).toBe('');
    expect(getInitialTarget([], null)).toBe('');
  });

  it('envía el profesional, «todo el equipo» o nada', () => {
    expect(toCreateInput(VALID, 'pro-ana')).toMatchObject({ professionalId: 'pro-ana' });
    expect(toCreateInput(VALID, ALL_TEAM)).toMatchObject({ allTeam: true });
    expect(toCreateInput(VALID, ALL_TEAM)).not.toHaveProperty('professionalId');
    expect(toCreateInput(VALID)).not.toHaveProperty('professionalId');
    expect(toCreateInput(VALID)).not.toHaveProperty('allTeam');
  });

  it('pide profesional solo si hace falta y tras validar el rango', () => {
    expect(getFormIssue(VALID, true)).toBe('professional');
    expect(getFormIssue({ ...VALID, endTime: '10:00' }, true)).toBe('endBeforeStart');
  });
});

describe('ScheduleBlockDialog · equipo', () => {
  beforeEach(() => {
    createScheduleBlockActionMock.mockReset();
    refreshMock.mockReset();
  });

  async function openWithTeam(team = TEAM, defaultProfessionalId: string | null = null) {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
        <ScheduleBlockDialog
          locale="es"
          now={NOW}
          team={team}
          defaultProfessionalId={defaultProfessionalId}
        />
      </NextIntlClientProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Bloquear horas' }));
    return { user, dialog: screen.getByRole('dialog') };
  }

  it('con un solo profesional no pregunta y envía el suyo', async () => {
    createScheduleBlockActionMock.mockResolvedValueOnce({ ok: true });
    const { user, dialog } = await openWithTeam([TEAM[0]]);

    expect(within(dialog).queryByLabelText('Profesional')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear' }));
    expect(createScheduleBlockActionMock).toHaveBeenCalledWith(
      'es',
      expect.objectContaining({ professionalId: 'pro-ana' }),
    );
  });

  it('con equipo obliga a elegir y envía el profesional elegido', async () => {
    createScheduleBlockActionMock.mockResolvedValueOnce({ ok: true });
    const { user, dialog } = await openWithTeam();
    const select = within(dialog).getByLabelText('Profesional');

    expect(select).toHaveValue('');
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Elige un profesional o «Todo el equipo».',
    );
    expect(within(dialog).getByRole('button', { name: 'Bloquear' })).toBeDisabled();

    await user.selectOptions(select, 'Luis');
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear' }));
    expect(createScheduleBlockActionMock).toHaveBeenCalledWith(
      'es',
      expect.objectContaining({ professionalId: 'pro-luis' }),
    );
  });

  it('«Todo el equipo» envía allTeam', async () => {
    createScheduleBlockActionMock.mockResolvedValueOnce({ ok: true });
    const { user, dialog } = await openWithTeam();

    await user.selectOptions(within(dialog).getByLabelText('Profesional'), 'Todo el equipo');
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear' }));

    const input = createScheduleBlockActionMock.mock.calls[0]?.[1];
    expect(input).toMatchObject({ allTeam: true });
    expect(input).not.toHaveProperty('professionalId');
  });

  it('preselecciona el profesional del filtro del calendario', async () => {
    const { dialog } = await openWithTeam(TEAM, 'pro-luis');
    expect(within(dialog).getByLabelText('Profesional')).toHaveValue('pro-luis');
    expect(within(dialog).getByRole('button', { name: 'Bloquear' })).toBeEnabled();
  });

  it('cuenta PROFESSIONAL_REQUIRED con su propio texto', async () => {
    createScheduleBlockActionMock.mockResolvedValueOnce({
      ok: false,
      code: 'PROFESSIONAL_REQUIRED',
    });
    const { user, dialog } = await openWithTeam(TEAM, 'pro-ana');
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Elige a qué profesional bloqueas o marca «Todo el equipo».',
    );
  });

  it('en los conflictos dice de qué profesional es cada cita', async () => {
    createScheduleBlockActionMock.mockResolvedValueOnce({
      ok: false,
      code: 'CONFLICT',
      conflicts: [
        {
          bookingId: 'bk-1',
          dateLabel: 'mar 3 nov',
          timeLabel: '11:30',
          clientName: 'Marta R.',
          serviceName: 'Corte mujer',
          professionalName: 'Luis',
        },
      ],
    });
    const { user, dialog } = await openWithTeam(TEAM, ALL_TEAM);
    await user.selectOptions(within(dialog).getByLabelText('Profesional'), 'Todo el equipo');
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear' }));

    const alert = await within(dialog).findByRole('alert');
    expect(within(alert).getByRole('listitem')).toHaveTextContent(
      'mar 3 nov · 11:30 — Marta R. (Corte mujer) · Luis',
    );
  });
});
