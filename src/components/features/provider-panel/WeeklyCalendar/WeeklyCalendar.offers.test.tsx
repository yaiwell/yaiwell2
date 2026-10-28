/**
 * Huecos liberados con descuento en el calendario semanal: bloque
 * discontinuo con el % vigente, detalle y «Retirar oferta».
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

import type { PanelBookingAction } from '../BookingActionsList/BookingActionsList.types';
import { WeeklyCalendar } from './WeeklyCalendar';
import { buildCalendarWeek } from './WeeklyCalendar.logic';
import type { PanelSlotOffer } from './WeeklyCalendar.types';

// Los enlaces de semana usan el Link de next-intl, que necesita el router.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: unknown; children: ReactNode }) => (
    <a href={JSON.stringify(href)} {...rest}>
      {children}
    </a>
  ),
}));

// Las acciones de los botones son server actions; aquí solo pintamos.
vi.mock('@/app/[locale]/panel/calendario/actions', () => ({
  cancelBookingAction: vi.fn(),
  completeBookingAction: vi.fn(),
}));
const withdrawSlotOfferActionMock = vi.fn();
vi.mock('@/app/[locale]/panel/calendario/slot-offers.actions', () => ({
  releaseCancelledSlotAction: vi.fn(),
  releaseFreeSlotAction: vi.fn(),
  withdrawSlotOfferAction: (...args: unknown[]) => withdrawSlotOfferActionMock(...args),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

/** Martes 27 de octubre de 2026, 10:00 en Madrid. */
const NOW = new Date('2026-10-27T09:00:00.000Z');

function confirmedBooking(overrides: Partial<PanelBookingAction> = {}): PanelBookingAction {
  return {
    id: 'bk-1',
    startAtIso: '2026-10-29T15:00:00.000Z',
    weekday: 3,
    startTime: '16:00',
    endTime: '17:00',
    clientName: 'Marta R.',
    serviceName: 'Corte mujer',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 4500,
    ...overrides,
  };
}

/** Hueco liberado el jueves a las 18:00 con un 20 % vigente. */
function openOffer(overrides: Partial<PanelSlotOffer> = {}): PanelSlotOffer {
  return {
    id: 'offer-1',
    startAtIso: '2026-10-29T17:00:00.000Z',
    weekday: 3,
    startTime: '18:00',
    endTime: '18:45',
    serviceName: 'Manicura',
    professionalName: 'Lucía',
    discounts: { over2h: 20, oneToTwoHours: 30, underOneHour: 40 },
    currentDiscountPct: 20,
    priceCents: 3000,
    currentPriceCents: 2400,
    ...overrides,
  };
}

function renderCalendar(
  bookings: PanelBookingAction[],
  readOnly = false,
  slotOffers: PanelSlotOffer[] = [],
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <WeeklyCalendar
        bookings={bookings}
        slotOffers={slotOffers}
        week={buildCalendarWeek('2026-10-26', NOW, 'es-ES')}
        locale="es"
        readOnly={readOnly}
        now={NOW}
      />
    </NextIntlClientProvider>,
  );
}

describe('WeeklyCalendar · huecos liberados', () => {
  it('pinta un hueco liberado como bloque discontinuo con el % vigente', () => {
    const { container } = renderCalendar([], false, [openOffer()]);

    const block = container.querySelector('[data-component="weekly-calendar-offer-offer-1"]');
    expect(block).toHaveTextContent('Hueco liberado · −20 %');
    expect(block).toHaveTextContent('18:00 · Manicura');
    expect(block?.className).toContain('border-dashed');
  });

  it('el detalle del hueco muestra precio y tramos y retira la oferta', () => {
    withdrawSlotOfferActionMock.mockResolvedValueOnce({ ok: true });
    const { container } = renderCalendar([], false, [openOffer()]);
    fireEvent.click(
      container.querySelector('[data-component="weekly-calendar-offer-offer-1"]') as Element,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Con más de 2 h de margen: 20 %')).toBeInTheDocument();
    expect(
      dialog.querySelector('[data-component="weekly-calendar-offer-price-offer-1"]'),
    ).toHaveTextContent(/24\s€.*30\s€/);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Retirar oferta' }));
    expect(withdrawSlotOfferActionMock).toHaveBeenCalledWith('es', 'offer-1');
  });

  it('pinta el hueco en la mitad derecha si pisa una reserva', () => {
    const { container } = renderCalendar(
      [confirmedBooking({ status: 'cancelled', startTime: '18:00', endTime: '18:45' })],
      false,
      [openOffer()],
    );

    const block = container.querySelector('[data-component="weekly-calendar-offer-offer-1"]');
    expect(block?.className).toContain('left-1/2');
  });

  it('sin descuento vigente no anuncia un 0 %', () => {
    const { container } = renderCalendar([], false, [openOffer({ currentDiscountPct: 0 })]);

    const block = container.querySelector('[data-component="weekly-calendar-offer-offer-1"]');
    expect(block).toHaveTextContent('Hueco liberado');
    expect(block).not.toHaveTextContent('%');
  });

  it('deshabilita «Retirar oferta» en modo preview y lo muestra en la vista móvil', () => {
    const { container } = renderCalendar([], true, [openOffer()]);
    fireEvent.click(
      container.querySelector('[data-component="weekly-calendar-day-tab-thu"]') as Element,
    );
    expect(
      container.querySelector('[data-component="weekly-calendar-offer-offer-1-day"]'),
    ).toBeInTheDocument();

    fireEvent.click(
      container.querySelector('[data-component="weekly-calendar-offer-offer-1"]') as Element,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Retirar oferta' })).toBeDisabled();
  });
});
