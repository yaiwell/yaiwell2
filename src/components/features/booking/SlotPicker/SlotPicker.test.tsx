import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SlotPicker } from './SlotPicker';

/**
 * Tests del componente SlotPicker.
 *
 * Mockeamos `fetch` para devolver una lista determinista de slots desde
 * el endpoint `/api/availability/services/[serviceId]`. El motor real
 * sólo devuelve slots disponibles (los ocupados quedan fuera de la
 * lista), así que no comprobamos el caso "disabled" — esa UX se quedó
 * en el generador fake heredado y ya no aplica al nuevo flujo.
 *
 * Anclamos `now` lejos en el futuro para que el formateo no excluya
 * slots por "hora ya pasada" del lado del cliente.
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
      emptySubtitle: 'Prueba con otro día del calendario.',
    },
  },
};

/**
 * Lista determinista de slots que el mock de fetch devuelve siempre.
 * Mezclamos mañana (10:00, 11:00) y tarde (16:00, 17:00) para validar
 * la partición `morning/afternoon` que hace `splitSlotsByDayPart`.
 */
const FAKE_SLOTS = [
  { startAtIso: '2099-06-14T10:00:00.000Z', endAtIso: '2099-06-14T11:00:00.000Z', available: true },
  { startAtIso: '2099-06-14T11:00:00.000Z', endAtIso: '2099-06-14T12:00:00.000Z', available: true },
  { startAtIso: '2099-06-14T16:00:00.000Z', endAtIso: '2099-06-14T17:00:00.000Z', available: true },
  { startAtIso: '2099-06-14T17:00:00.000Z', endAtIso: '2099-06-14T18:00:00.000Z', available: true },
];

beforeEach(() => {
  // Mock global de fetch: el hook llama a `/api/availability/...` y
  // aquí lo sustituimos por una respuesta JSON con la lista fija.
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ slots: FAKE_SLOTS, took: 0 }),
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPicker(overrides?: {
  selectedStartIso?: string | null;
  onSelect?: (slot: { startAtIso: string }) => void;
}) {
  const now = new Date(2099, 5, 14, 8, 0, 0); // 14 junio 2099, 08:00
  const onSelect = overrides?.onSelect ?? vi.fn();

  // Cliente nuevo por test para no compartir caché entre casos.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <SlotPicker
          providerId="prov-01"
          serviceId="svc-01"
          serviceDurationMinutes={60}
          locale="es"
          selectedStartIso={overrides?.selectedStartIso ?? null}
          onSelect={onSelect}
          now={now}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );

  return { ...utils, onSelect, now };
}

describe('SlotPicker', () => {
  it('renderiza la tira de días con 14 pestañas navegables', () => {
    renderPicker();

    const tabList = screen.getByRole('tablist', { name: 'Días disponibles' });
    const tabs = within(tabList).getAllByRole('tab');

    expect(tabs).toHaveLength(14);
  });

  it('muestra los encabezados de "Mañana" y "Tarde" cuando hay slots', async () => {
    renderPicker();

    // Esperar a que el fetch resuelva y aparezcan los headers (que sólo
    // se renderizan cuando hay al menos un slot).
    await waitFor(() => {
      expect(screen.getByText('Mañana')).toBeInTheDocument();
      expect(screen.getByText('Tarde')).toBeInTheDocument();
    });
  });

  it('invoca onSelect con el slot al hacer click en un hueco disponible', async () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });

    // Esperamos a que aparezcan los headers (señal de que el fetch resolvió),
    // luego seleccionamos cualquier botón de la cuadrícula de slots por su
    // data-component (estable y único por slot).
    await screen.findByText('Mañana');

    const enabledSlot = screen
      .getAllByRole('button')
      .find((btn) => btn.getAttribute('data-component')?.startsWith('booking-slot-picker-slot-'));

    expect(enabledSlot).toBeDefined();
    if (!enabledSlot) return;

    await userEvent.click(enabledSlot);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        startAtIso: expect.any(String),
        endAtIso: expect.any(String),
        available: true,
      }),
    );
  });

  it('llama al endpoint correcto al seleccionar otro día', async () => {
    renderPicker();

    // Esperar a la primera carga.
    await screen.findByText('Mañana');

    const fetchSpy = vi.mocked(global.fetch);
    const initialCalls = fetchSpy.mock.calls.length;

    const tabList = screen.getByRole('tablist', { name: 'Días disponibles' });
    const tabs = within(tabList).getAllByRole('tab');

    // Saltamos al tercer día y validamos que dispare un nuevo fetch
    // con la fecha correspondiente en el querystring.
    await userEvent.click(tabs[2]);

    await waitFor(() => {
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(initialCalls);
    });
    const lastUrl = String(fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0]);
    expect(lastUrl).toMatch(/\/api\/availability\/services\/svc-01\?date=\d{4}-\d{2}-\d{2}/u);
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
  });
});
