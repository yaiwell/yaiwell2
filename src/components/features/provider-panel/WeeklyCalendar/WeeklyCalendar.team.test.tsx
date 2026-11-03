import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

import type { PanelBookingAction } from '../BookingActionsList/BookingActionsList.types';
import { WeeklyCalendar } from './WeeklyCalendar';
import { buildCalendarWeek } from './WeeklyCalendar.logic';
import type { PanelScheduleBlock } from './WeeklyCalendar.types';

// El Link de next-intl necesita el router: lo cambiamos por un <a>.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: unknown; children: ReactNode }) => (
    <a href={JSON.stringify(href)} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/app/[locale]/panel/calendario/actions', () => ({
  cancelBookingAction: vi.fn(),
  completeBookingAction: vi.fn(),
}));
vi.mock('@/app/[locale]/panel/calendario/slot-offers.actions', () => ({
  releaseCancelledSlotAction: vi.fn(),
  releaseFreeSlotAction: vi.fn(),
  withdrawSlotOfferAction: vi.fn(),
}));
vi.mock('@/app/[locale]/panel/calendario/schedule-blocks.actions', () => ({
  removeScheduleBlockAction: vi.fn(),
}));

/** Martes 27 de octubre de 2026, 10:00 en Madrid. */
const NOW = new Date('2026-10-27T09:00:00.000Z');
const TEAM = [
  { id: 'pro-ana', name: 'Ana' },
  { id: 'pro-luis', name: 'Luis' },
];

function booking(overrides: Partial<PanelBookingAction>): PanelBookingAction {
  return {
    id: 'bk-1',
    startAtIso: '2026-10-29T15:00:00.000Z',
    weekday: 3,
    startTime: '16:00',
    endTime: '17:00',
    clientName: 'Marta R.',
    serviceName: 'Corte mujer',
    professionalId: 'pro-ana',
    professionalName: 'Ana',
    status: 'confirmed',
    priceCents: 4500,
    ...overrides,
  };
}

const BLOCK: PanelScheduleBlock = {
  id: 'blk-1',
  segmentKey: 'blk-1:2026-10-29',
  weekday: 3,
  startTime: '16:30',
  endTime: '18:00',
  reason: null,
  professionalId: 'pro-luis',
  professionalName: 'Luis',
  startAtIso: null,
  endAtIso: null,
  isFullDay: false,
};

function renderCalendar({
  bookings = [] as PanelBookingAction[],
  blocks = [] as PanelScheduleBlock[],
  team = TEAM,
  selected = null as string | null,
  weekKey = '2026-10-26',
}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <WeeklyCalendar
        bookings={bookings}
        scheduleBlocks={blocks}
        week={buildCalendarWeek(weekKey, NOW, 'es-ES')}
        locale="es"
        readOnly={false}
        now={NOW}
        team={team}
        selectedProfessionalId={selected}
      />
    </NextIntlClientProvider>,
  );
}

const dc = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-component="${name}"]`);

describe('WeeklyCalendar · equipo', () => {
  it('con un solo profesional no enseña el filtro', () => {
    const { container } = renderCalendar({ team: [TEAM[0]] });
    expect(dc(container, 'calendar-professional-filter')).toBeNull();
  });

  it('enseña «Todos» y cada profesional, marcando el elegido', () => {
    renderCalendar({ selected: 'pro-luis' });

    const nav = screen.getByRole('navigation', { name: 'Filtrar por profesional' });
    expect(nav).toHaveTextContent('TodosAnaLuis');
    expect(screen.getByRole('link', { name: 'Luis' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Todos' })).not.toHaveAttribute('aria-current');
  });

  it('las fichas conservan la semana y las flechas conservan el profesional', () => {
    renderCalendar({ selected: 'pro-luis', weekKey: '2026-11-02' });

    const ana = JSON.parse(screen.getByRole('link', { name: 'Ana' }).getAttribute('href') ?? '');
    expect(ana.query).toEqual({ semana: '2026-11-02', pro: 'pro-ana' });
    const all = JSON.parse(screen.getByRole('link', { name: 'Todos' }).getAttribute('href') ?? '');
    expect(all.query).toEqual({ semana: '2026-11-02' });

    const next = JSON.parse(screen.getByLabelText('Semana siguiente').getAttribute('href') ?? '');
    expect(next.query).toEqual({ semana: '2026-11-09', pro: 'pro-luis' });
    const today = JSON.parse(screen.getByText('Hoy').getAttribute('href') ?? '');
    expect(today.query).toEqual({ pro: 'pro-luis' });
  });

  it('en la semana actual las fichas no escriben ?semana=', () => {
    renderCalendar({});
    const ana = JSON.parse(screen.getByRole('link', { name: 'Ana' }).getAttribute('href') ?? '');
    expect(ana.query).toEqual({ pro: 'pro-ana' });
  });

  it('en «Todos» cada bloque dice de quién es y lo que coincide va en carriles', () => {
    const { container } = renderCalendar({
      bookings: [
        booking({}),
        booking({
          id: 'bk-2',
          startTime: '16:00',
          professionalId: 'pro-luis',
          professionalName: 'Luis',
        }),
      ],
      blocks: [BLOCK],
    });

    const ana = dc(container, 'weekly-calendar-booking-bk-1');
    const luis = dc(container, 'weekly-calendar-booking-bk-2');
    const block = dc(container, 'weekly-calendar-block-blk-1:2026-10-29');
    expect(ana).toHaveTextContent('Ana');
    expect(ana).toHaveAccessibleName('Corte mujer con Marta R. a las 16:00 · Ana');
    expect(block).toHaveTextContent('Luis');

    // Tres a la vez, un tercio cada uno, por orden de inicio: las dos
    // citas de las 16:00 y luego el bloqueo de las 16:30.
    expect(ana?.style.left).toBe('calc(0% + 2px)');
    expect(luis?.style.left).toMatch(/^calc\(33\.3+\d*% \+ 2px\)$/);
    expect(block?.style.right).toBe('calc(0% + 2px)');
  });

  it('con un profesional filtrado no repite su nombre en los bloques', () => {
    const { container } = renderCalendar({ bookings: [booking({})], selected: 'pro-ana' });
    const block = dc(container, 'weekly-calendar-booking-bk-1');
    expect(block).not.toHaveTextContent('Ana');
    expect(block?.style.left).toBe('');
  });
});
