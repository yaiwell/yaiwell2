import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SlotPicker } from './SlotPicker';
import { buildSlotsUrl } from './SlotPicker.fetch';
import { isSelectionGone } from './SlotPicker.guard';

/**
 * Tests del SlotPicker con profesional elegido (CLAUDE.md §4.bis «Equipo»):
 *  - La petición de huecos lleva `&professionalId=` solo si hay uno.
 *  - Cambiar de profesional pide otra agenda.
 *  - Si la hora elegida no está en la nueva agenda, avisa para limpiarla.
 *  - Un 404 con profesional elegido ofrece volver a «cualquiera».
 */

const messages = {
  booking: {
    slotPicker: {
      dayStripLabel: 'Días disponibles',
      morning: 'Mañana',
      afternoon: 'Tarde',
      noMorningSlots: 'Sin huecos por la mañana',
      noAfternoonSlots: 'Sin huecos por la tarde',
      emptyTitle: 'Sin huecos este día',
      emptySubtitle: 'Prueba con otro día.',
      loadingLabel: 'Buscando huecos…',
      errorTitle: 'Error',
      errorSubtitle: 'Vuelve a intentarlo.',
      retry: 'Reintentar',
      notBookableTitle: 'No admite reserva online',
      notBookableSubtitle: 'Sin agenda.',
      lastMinuteGroup: 'En las próximas 2 h',
    },
    slotOffer: { slotGone: 'Ese hueco ya no está.' },
    professionalPicker: {
      unavailable: 'Ese profesional ya no presta este servicio.',
      chooseAgain: 'Elegir otro profesional',
    },
  },
};

const SLOT_10 = {
  startAtIso: '2099-06-14T10:00:00.000Z',
  endAtIso: '2099-06-14T11:00:00.000Z',
  available: true,
};
const SLOT_17 = {
  startAtIso: '2099-06-14T17:00:00.000Z',
  endAtIso: '2099-06-14T18:00:00.000Z',
  available: true,
};

function okResponse(slots: unknown[]): Response {
  return { ok: true, status: 200, json: async () => ({ slots, took: 0 }) } as Response;
}

function notFoundResponse(): Response {
  return {
    ok: false,
    status: 404,
    json: async () => ({ error: { code: 'PROFESSIONAL_NOT_FOR_SERVICE', message: 'No.' } }),
  } as Response;
}

/** Última URL pedida al endpoint de huecos. */
function lastFetchedUrl(): string {
  const calls = vi.mocked(global.fetch).mock.calls;
  return String(calls[calls.length - 1]?.[0]);
}

beforeEach(() => {
  vi.spyOn(global, 'fetch').mockResolvedValue(okResponse([SLOT_10, SLOT_17]));
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface PickerProps {
  professionalId?: string | null;
  selectedStartIso?: string | null;
  onSelectionGone?: () => void;
  onResetProfessional?: () => void;
}

function Wrapper({ children, client }: { children: ReactNode; client: QueryClient }) {
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={messages}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function picker(props: PickerProps) {
  return (
    <SlotPicker
      providerId="prov-01"
      serviceId="svc-01"
      serviceDurationMinutes={60}
      locale="es"
      selectedStartIso={props.selectedStartIso ?? null}
      onSelect={vi.fn()}
      now={new Date(2099, 5, 14, 8, 0, 0)}
      professionalId={props.professionalId ?? null}
      onSelectionGone={props.onSelectionGone}
      onResetProfessional={props.onResetProfessional}
    />
  );
}

function renderPicker(props: PickerProps = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const utils = render(<Wrapper client={client}>{picker(props)}</Wrapper>);
  return {
    ...utils,
    rerenderWith: (next: PickerProps) =>
      utils.rerender(<Wrapper client={client}>{picker(next)}</Wrapper>),
  };
}

describe('buildSlotsUrl', () => {
  it('sin profesional pide la unión del equipo y con él añade el parámetro', () => {
    expect(buildSlotsUrl('svc 1', '2099-06-14', null)).toBe(
      '/api/availability/services/svc%201?date=2099-06-14',
    );
    expect(buildSlotsUrl('svc', '2099-06-14', 'pro-1')).toBe(
      '/api/availability/services/svc?date=2099-06-14&professionalId=pro-1',
    );
  });
});

describe('isSelectionGone', () => {
  const now = new Date('2099-06-14T06:00:00.000Z');

  it('la hora sigue en la agenda → no se toca', () => {
    expect(isSelectionGone([SLOT_10, SLOT_17], SLOT_17.startAtIso, now)).toBe(false);
  });

  it('la hora no está en la agenda nueva → se suelta', () => {
    expect(isSelectionGone([SLOT_10], SLOT_17.startAtIso, now)).toBe(true);
  });
});

describe('SlotPicker con profesional', () => {
  it('«cualquiera» no manda professionalId; elegir uno recarga con su agenda', async () => {
    const { rerenderWith } = renderPicker();
    await screen.findByText('Mañana');
    expect(lastFetchedUrl()).not.toContain('professionalId');

    rerenderWith({ professionalId: 'pro-2' });

    await waitFor(() => expect(lastFetchedUrl()).toContain('&professionalId=pro-2'));
  });

  it('avisa si la hora elegida ya no está en la agenda del profesional', async () => {
    const onSelectionGone = vi.fn();
    const { rerenderWith } = renderPicker({
      selectedStartIso: SLOT_17.startAtIso,
      onSelectionGone,
    });
    await screen.findByText('Mañana');
    expect(onSelectionGone).not.toHaveBeenCalled();

    // La profesional elegida solo tiene las 10:00.
    vi.mocked(global.fetch).mockResolvedValue(okResponse([SLOT_10]));
    rerenderWith({
      professionalId: 'pro-2',
      selectedStartIso: SLOT_17.startAtIso,
      onSelectionGone,
    });

    await waitFor(() => expect(onSelectionGone).toHaveBeenCalled());
  });

  it('404 con profesional elegido ofrece volver a «cualquiera»', async () => {
    vi.mocked(global.fetch).mockResolvedValue(notFoundResponse());
    const onResetProfessional = vi.fn();
    renderPicker({ professionalId: 'pro-gone', onResetProfessional });

    await screen.findByText('Ese profesional ya no presta este servicio.');
    await userEvent.click(screen.getByRole('button', { name: 'Elegir otro profesional' }));

    expect(onResetProfessional).toHaveBeenCalled();
  });
});
