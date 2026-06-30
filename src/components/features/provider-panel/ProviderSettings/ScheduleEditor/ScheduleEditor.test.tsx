/**
 * Tests del editor de horario semanal.
 *
 * Smoke de los handlers principales contra `onChange`:
 *  - toggle abre/cierra día con valor default.
 *  - addBlock añade tramo.
 *  - removeBlock quita tramo.
 *  - updateBlock cambia open/close.
 *  - disabled bloquea inputs.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import type { WeeklySchedule } from '@/lib/services/availability';

import { ScheduleEditor } from './ScheduleEditor';

const messages = {
  providerPanel: {
    settings: {
      schedule: {
        openLabel: 'Open',
        closedLabel: 'Closed',
        closedHint: 'No service this day.',
        addBlock: 'Add slot',
        toggleAria: 'Toggle availability for {day}',
        removeBlockAria: 'Remove slot for {day}',
        openFrom: 'Opens',
        openTo: 'Closes',
        days: {
          monday: 'Monday',
          tuesday: 'Tuesday',
          wednesday: 'Wednesday',
          thursday: 'Thursday',
          friday: 'Friday',
          saturday: 'Saturday',
          sunday: 'Sunday',
        },
      },
    },
  },
};

function emptySchedule(): WeeklySchedule {
  return {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };
}

function renderEditor(value: WeeklySchedule, opts: { disabled?: boolean } = {}) {
  const onChange = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Madrid">
      <ScheduleEditor value={value} onChange={onChange} disabled={opts.disabled} />
    </NextIntlClientProvider>,
  );
  return { onChange };
}

describe('ScheduleEditor', () => {
  it('pinta los 7 días con su nombre traducido', () => {
    renderEditor(emptySchedule());

    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
    expect(screen.getByText('Sunday')).toBeInTheDocument();
  });

  it('abre un día cerrado con el tramo default 09:00-18:00 al activar el toggle', () => {
    const { onChange } = renderEditor(emptySchedule());

    const toggle = screen.getByLabelText('Toggle availability for Monday');
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledOnce();
    const next = onChange.mock.calls[0][0] as WeeklySchedule;
    expect(next.monday).toEqual([{ open: '09:00', close: '18:00' }]);
  });

  it('cierra un día abierto al desactivar el toggle', () => {
    const value = emptySchedule();
    value.monday = [{ open: '10:00', close: '14:00' }];
    const { onChange } = renderEditor(value);

    const toggle = screen.getByLabelText('Toggle availability for Monday');
    fireEvent.click(toggle);

    const next = onChange.mock.calls[0][0] as WeeklySchedule;
    expect(next.monday).toEqual([]);
  });

  it('añade un tramo extra al pulsar "Add slot"', () => {
    const value = emptySchedule();
    value.tuesday = [{ open: '09:00', close: '14:00' }];
    const { onChange } = renderEditor(value);

    // Filtramos por el día específico para no chocar con otros "Add slot"
    // (cada día abierto tiene su propio botón).
    const addButtons = screen.getAllByText('Add slot');
    fireEvent.click(addButtons[0]);

    const next = onChange.mock.calls[0][0] as WeeklySchedule;
    expect(next.tuesday).toHaveLength(2);
    expect(next.tuesday[1]).toEqual({ open: '09:00', close: '18:00' });
  });

  it('elimina un tramo al pulsar el botón con aria removeBlock', () => {
    const value = emptySchedule();
    value.thursday = [
      { open: '10:00', close: '13:00' },
      { open: '16:00', close: '20:00' },
    ];
    const { onChange } = renderEditor(value);

    const removeButtons = screen.getAllByLabelText('Remove slot for Thursday');
    fireEvent.click(removeButtons[0]);

    const next = onChange.mock.calls[0][0] as WeeklySchedule;
    expect(next.thursday).toEqual([{ open: '16:00', close: '20:00' }]);
  });

  it('actualiza la hora de apertura al cambiar el input time', () => {
    const value = emptySchedule();
    value.friday = [{ open: '09:00', close: '18:00' }];
    const { onChange } = renderEditor(value);

    const openInput = screen.getAllByLabelText('Opens')[0];
    fireEvent.change(openInput, { target: { value: '10:30' } });

    const next = onChange.mock.calls[0][0] as WeeklySchedule;
    expect(next.friday[0].open).toBe('10:30');
  });

  it('deshabilita todos los inputs si disabled=true', () => {
    const value = emptySchedule();
    value.monday = [{ open: '09:00', close: '18:00' }];
    renderEditor(value, { disabled: true });

    expect(screen.getByLabelText('Toggle availability for Monday')).toBeDisabled();
    expect(screen.getAllByLabelText('Opens')[0]).toBeDisabled();
  });
});
