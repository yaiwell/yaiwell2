import { fireEvent, render, screen, within } from '@testing-library/react';
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
import { getDefaultValues, getFormIssue, toCreateInput } from './ScheduleBlockDialog.logic';

/** Martes 3 de noviembre de 2026, 10:20 en Madrid (CET, UTC+1). */
const NOW = new Date('2026-11-03T09:20:00.000Z');

const VALID = {
  startDateKey: '2026-11-04',
  startTime: '10:00',
  endDateKey: '2026-11-04',
  endTime: '12:00',
  reason: '',
};

describe('ScheduleBlockDialog.logic', () => {
  it('propone hoy, de la próxima hora en punto a una hora más (hora de Madrid)', () => {
    expect(getDefaultValues(NOW)).toEqual({
      startDateKey: '2026-11-03',
      startTime: '11:00',
      endDateKey: '2026-11-03',
      endTime: '12:00',
      reason: '',
    });
  });

  it('pasada las 23:00 propone el día siguiente', () => {
    // 23:20 en Madrid.
    expect(getDefaultValues(new Date('2026-11-03T22:20:00.000Z'))).toMatchObject({
      startDateKey: '2026-11-04',
      startTime: '00:00',
      endDateKey: '2026-11-04',
      endTime: '01:00',
    });
    // 22:20 en Madrid: empieza hoy a las 23:00 y acaba mañana a las 00:00.
    expect(getDefaultValues(new Date('2026-11-03T21:20:00.000Z'))).toMatchObject({
      startDateKey: '2026-11-03',
      startTime: '23:00',
      endDateKey: '2026-11-04',
      endTime: '00:00',
    });
  });

  it('valida campos, pasos de 5 min y que el fin vaya después del inicio', () => {
    expect(getFormIssue(VALID)).toBeNull();
    expect(getFormIssue({ ...VALID, endTime: '' })).toBe('required');
    expect(getFormIssue({ ...VALID, startTime: '10:03' })).toBe('step');
    expect(getFormIssue({ ...VALID, endTime: '10:00' })).toBe('endBeforeStart');
    expect(getFormIssue({ ...VALID, endDateKey: '2026-11-03', endTime: '18:00' })).toBe(
      'endBeforeStart',
    );
    // Varios días: el fin al día siguiente a una hora menor es válido.
    expect(getFormIssue({ ...VALID, endDateKey: '2026-11-05', endTime: '09:00' })).toBeNull();
  });

  it('no envía el motivo vacío y lo recorta', () => {
    expect(toCreateInput({ ...VALID, reason: '   ' })).not.toHaveProperty('reason');
    expect(toCreateInput({ ...VALID, reason: '  Médico ' }).reason).toBe('Médico');
  });
});

function renderDialog() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <ScheduleBlockDialog locale="es" now={NOW} />
    </NextIntlClientProvider>,
  );
}

async function openDialog() {
  const user = userEvent.setup();
  renderDialog();
  await user.click(screen.getByRole('button', { name: 'Bloquear horas' }));
  return { user, dialog: screen.getByRole('dialog') };
}

describe('ScheduleBlockDialog', () => {
  beforeEach(() => {
    createScheduleBlockActionMock.mockReset();
    refreshMock.mockReset();
  });

  it('abre con los valores por defecto, campos etiquetados y ayuda de privacidad', async () => {
    const { dialog } = await openDialog();
    const dates = within(dialog).getAllByLabelText('Fecha');
    const times = within(dialog).getAllByLabelText('Hora');
    expect(dates.map((el) => (el as HTMLInputElement).value)).toEqual(['2026-11-03', '2026-11-03']);
    expect(times.map((el) => (el as HTMLInputElement).value)).toEqual(['11:00', '12:00']);
    expect(times[0]).toHaveAttribute('step', '300');
    expect(within(dialog).getByText('Solo lo ves tú.')).toBeInTheDocument();
    expect(within(dialog).getByText('0/200')).toBeInTheDocument();
  });

  it('bloquea el envío si el fin no es posterior al inicio', async () => {
    const { dialog } = await openDialog();
    // Los inputs nativos de hora no se teclean igual en jsdom: fijamos el valor.
    fireEvent.change(within(dialog).getAllByLabelText('Hora')[1], { target: { value: '10:00' } });

    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'El final tiene que ser posterior al inicio.',
    );
    expect(within(dialog).getByRole('button', { name: 'Bloquear' })).toBeDisabled();
    expect(createScheduleBlockActionMock).not.toHaveBeenCalled();
  });

  it('envía el rango y el motivo, y confirma al crear', async () => {
    createScheduleBlockActionMock.mockResolvedValueOnce({ ok: true });
    const { user, dialog } = await openDialog();
    await user.type(within(dialog).getByLabelText('Motivo (opcional)'), 'Médico');
    expect(within(dialog).getByText('6/200')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear' }));

    expect(createScheduleBlockActionMock).toHaveBeenCalledWith('es', {
      startDateKey: '2026-11-03',
      startTime: '11:00',
      endDateKey: '2026-11-03',
      endTime: '12:00',
      reason: 'Médico',
    });
    expect(await within(dialog).findByText('Horas bloqueadas')).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalled();
  });

  it('lista las citas que chocan cuando el servidor responde CONFLICT', async () => {
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
        },
        {
          bookingId: 'bk-2',
          dateLabel: 'mar 3 nov',
          timeLabel: '11:45',
          clientName: null,
          serviceName: 'Manicura',
        },
      ],
    });
    const { user, dialog } = await openDialog();
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear' }));

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('Hay citas en ese rango:');
    const items = within(alert).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('mar 3 nov · 11:30 — Marta R. (Corte mujer)');
    expect(items[1]).toHaveTextContent('mar 3 nov · 11:45 — Manicura');
    expect(alert).toHaveTextContent('Cancélalas antes desde el calendario');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('traduce el resto de códigos de error del servidor', async () => {
    createScheduleBlockActionMock.mockResolvedValueOnce({ ok: false, code: 'TOO_LONG' });
    const { user, dialog } = await openDialog();
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Un bloqueo puede durar como mucho 60 días.',
    );
    expect(within(dialog).queryByRole('list')).not.toBeInTheDocument();
  });
});
