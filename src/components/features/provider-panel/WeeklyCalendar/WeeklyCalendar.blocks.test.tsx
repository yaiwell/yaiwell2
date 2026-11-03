/**
 * Bloqueos puntuales de agenda en el calendario semanal: agrupación por
 * día, recorte a las horas visibles (sin inflar la rejilla con días
 * completos) y el bloque rayado con «Quitar bloqueo» confirmado.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

const refreshMock = vi.fn();
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: unknown; children: ReactNode }) => (
    <a href={JSON.stringify(href)} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

// Las acciones son server actions: aquí solo se comprueba qué se envía.
vi.mock('@/app/[locale]/panel/calendario/actions', () => ({
  cancelBookingAction: vi.fn(),
  completeBookingAction: vi.fn(),
}));
vi.mock('@/app/[locale]/panel/calendario/slot-offers.actions', () => ({
  releaseCancelledSlotAction: vi.fn(),
  releaseFreeSlotAction: vi.fn(),
  withdrawSlotOfferAction: vi.fn(),
}));
const removeScheduleBlockActionMock = vi.fn();
vi.mock('@/app/[locale]/panel/calendario/schedule-blocks.actions', () => ({
  createScheduleBlockAction: vi.fn(),
  removeScheduleBlockAction: (...args: unknown[]) => removeScheduleBlockActionMock(...args),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

import { WeeklyCalendar } from './WeeklyCalendar';
import { getScheduleBlockRangeSpans, groupScheduleBlocksByWeekday } from './WeeklyCalendar.blocks';
import { buildCalendarWeek, getHoursRange } from './WeeklyCalendar.logic';
import type { PanelScheduleBlock } from './WeeklyCalendar.types';

/** Martes 27 de octubre de 2026, 10:00 en Madrid. */
const NOW = new Date('2026-10-27T09:00:00.000Z');

/** Bloqueo del jueves de 13:00 a 15:00 con motivo. */
function block(overrides: Partial<PanelScheduleBlock> = {}): PanelScheduleBlock {
  return {
    id: 'blk-1',
    segmentKey: 'blk-1:2026-10-29',
    weekday: 3,
    startTime: '13:00',
    endTime: '15:00',
    reason: 'Médico',
    startAtIso: '2026-10-29T12:00:00.000Z',
    endAtIso: '2026-10-29T14:00:00.000Z',
    isFullDay: false,
    ...overrides,
  };
}

const FULL_DAY = block({
  id: 'blk-2',
  segmentKey: 'blk-2:2026-10-31',
  weekday: 5,
  startTime: '00:00',
  endTime: '24:00',
  reason: null,
  isFullDay: true,
});

describe('WeeklyCalendar.blocks', () => {
  it('un día completo no amplía la rejilla y se recorta a las horas visibles', () => {
    const hours = getHoursRange([], getScheduleBlockRangeSpans([FULL_DAY]));
    expect(hours[0]).toBe(8);
    expect(hours[hours.length - 1]).toBe(20);

    const grouped = groupScheduleBlocksByWeekday([FULL_DAY], hours);
    expect(grouped.sat).toHaveLength(1);
    // De 08:00 a 21:00 → 13 h × 60 px, empezando arriba del todo.
    expect(grouped.sat[0].topPx).toBe(0);
    expect(grouped.sat[0].heightPx).toBe(13 * 60);
  });

  it('un bloqueo explícito fuera del horario sí amplía la rejilla', () => {
    const late = block({ startTime: '21:30', endTime: '22:30' });
    const hours = getHoursRange([], getScheduleBlockRangeSpans([late]));
    expect(hours[hours.length - 1]).toBe(22);

    const grouped = groupScheduleBlocksByWeekday([late], hours);
    expect(grouped.thu[0].topPx).toBe((21.5 - 8) * 60);
    expect(grouped.thu[0].heightPx).toBe(60);
  });

  it('los trozos que tocan medianoche no amplían la rejilla y se recortan', () => {
    const tail = block({ segmentKey: 'blk-1:a', startTime: '19:00', endTime: '24:00' });
    const head = block({ segmentKey: 'blk-1:b', weekday: 4, startTime: '00:00', endTime: '09:30' });
    const hours = getHoursRange([], getScheduleBlockRangeSpans([tail, head]));
    expect(hours).toHaveLength(13);

    const grouped = groupScheduleBlocksByWeekday([tail, head], hours);
    expect(grouped.thu[0]).toMatchObject({ topPx: 11 * 60, heightPx: 2 * 60 });
    expect(grouped.fri[0]).toMatchObject({ topPx: 0, heightPx: 90 });
  });

  it('descarta el tramo que queda entero fuera de las horas visibles', () => {
    const night = block({ startTime: '00:00', endTime: '06:00' });
    const grouped = groupScheduleBlocksByWeekday([night], getHoursRange([]));
    expect(grouped.thu).toHaveLength(0);
  });
});

function renderCalendar(scheduleBlocks: PanelScheduleBlock[], readOnly = false) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <WeeklyCalendar
        bookings={[]}
        scheduleBlocks={scheduleBlocks}
        week={buildCalendarWeek('2026-10-26', NOW, 'es-ES')}
        locale="es"
        readOnly={readOnly}
        now={NOW}
      />
    </NextIntlClientProvider>,
  );
}

const BLOCK_SELECTOR = '[data-component="weekly-calendar-block-blk-1:2026-10-29"]';

describe('WeeklyCalendar · bloqueos de agenda', () => {
  beforeEach(() => {
    removeScheduleBlockActionMock.mockReset();
    refreshMock.mockReset();
  });

  it('pinta el bloqueo con su motivo y lo añade a la leyenda', () => {
    const { container } = renderCalendar([block()]);
    const el = container.querySelector(BLOCK_SELECTOR);
    expect(el).toHaveTextContent('Bloqueado');
    expect(el).toHaveTextContent('Médico');
    expect(el).toHaveAttribute('aria-label', 'Horas bloqueadas: 13:00–15:00');
    expect(container.querySelector('[data-component="weekly-calendar-legend"]')).toHaveTextContent(
      'Bloqueado',
    );
  });

  it('un día completo se anuncia como «Todo el día»', () => {
    const { container } = renderCalendar([FULL_DAY]);
    const el = container.querySelector('[data-component="weekly-calendar-block-blk-2:2026-10-31"]');
    expect(el).toHaveAttribute('aria-label', 'Horas bloqueadas: Todo el día');
  });

  it('quitar el bloqueo pide confirmación antes de llamar al servidor', async () => {
    removeScheduleBlockActionMock.mockResolvedValueOnce({ ok: true });
    const { container } = renderCalendar([block()]);
    fireEvent.click(container.querySelector(BLOCK_SELECTOR) as Element);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Médico')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /Quitar bloqueo/ }));
    expect(removeScheduleBlockActionMock).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, quitar' }));
    expect(removeScheduleBlockActionMock).toHaveBeenCalledWith('es', 'blk-1');
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(within(dialog).getByRole('status')).toHaveTextContent('Bloqueo quitado');
  });

  it('cuenta el error si el bloqueo ya no existe', async () => {
    removeScheduleBlockActionMock.mockResolvedValueOnce({ ok: false, code: 'NOT_FOUND' });
    const { container } = renderCalendar([block()]);
    fireEvent.click(container.querySelector(BLOCK_SELECTOR) as Element);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Quitar bloqueo/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, quitar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Este bloqueo ya no existe');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('en modo preview «Quitar bloqueo» está deshabilitado y sale en la vista móvil', () => {
    const { container } = renderCalendar([block()], true);
    fireEvent.click(
      container.querySelector('[data-component="weekly-calendar-day-tab-thu"]') as Element,
    );
    expect(
      container.querySelector('[data-component="weekly-calendar-block-blk-1:2026-10-29-day"]'),
    ).toBeInTheDocument();

    fireEvent.click(container.querySelector(BLOCK_SELECTOR) as Element);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /Quitar bloqueo/ })).toBeDisabled();
  });
});
