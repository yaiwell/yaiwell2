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
 *
 * Los tres estados (cargando / error / cargado) se prueban por separado
 * porque el bug que motivó este bloque era precisamente colapsarlos:
 * un 500 del servidor se leía como "este centro no tiene hueco".
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
      loadingLabel: 'Buscando huecos…',
      errorTitle: 'No hemos podido cargar los huecos',
      errorSubtitle: 'Ha fallado la conexión con el centro. Vuelve a intentarlo.',
      retry: 'Reintentar',
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

/** Respuesta OK con la lista de slots indicada. */
function okResponse(slots: unknown[] = FAKE_SLOTS): Response {
  return { ok: true, status: 200, json: async () => ({ slots, took: 0 }) } as Response;
}

/** Respuesta 500 con el sobre de error del Route Handler. */
function serverErrorResponse(): Response {
  return {
    ok: false,
    status: 500,
    json: async () => ({ error: { code: 'INTERNAL', message: 'Error inesperado.' } }),
  } as Response;
}

beforeEach(() => {
  // Mock global de fetch: el hook llama a `/api/availability/...` y
  // aquí lo sustituimos por una respuesta JSON con la lista fija.
  vi.spyOn(global, 'fetch').mockResolvedValue(okResponse());
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
  // `retry: false` para que un fallo se propague al primer intento y el
  // test del estado de error no dependa de temporizadores internos.
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

  describe('estado de carga', () => {
    it('muestra el esqueleto y NO el mensaje de "sin huecos" mientras la petición está en vuelo', () => {
      // Petición que nunca resuelve: el componente se queda en `isPending`.
      vi.mocked(global.fetch).mockReturnValue(new Promise<Response>(() => {}));

      renderPicker();

      expect(screen.getByRole('status', { name: 'Buscando huecos…' })).toBeInTheDocument();
      expect(screen.queryByText('Sin huecos este día')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      // La tira de días sigue navegable durante la carga.
      expect(screen.getByRole('tablist', { name: 'Días disponibles' })).toBeInTheDocument();
    });
  });

  describe('estado vacío', () => {
    it('muestra "sin huecos" solo cuando la API responde 200 con lista vacía', async () => {
      vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

      renderPicker();

      expect(await screen.findByText('Sin huecos este día')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('estado de error', () => {
    it('muestra un mensaje de fallo (y no "sin huecos") cuando la API devuelve 500', async () => {
      vi.mocked(global.fetch).mockResolvedValue(serverErrorResponse());

      renderPicker();

      const alert = await screen.findByRole('alert');
      expect(within(alert).getByText('No hemos podido cargar los huecos')).toBeInTheDocument();
      // Lo esencial: un fallo de servidor NO puede leerse como
      // "este centro no tiene hueco".
      expect(screen.queryByText('Sin huecos este día')).not.toBeInTheDocument();
      expect(screen.queryByText('Mañana')).not.toBeInTheDocument();
    });

    it('reintenta la petición al pulsar "Reintentar" y pinta los huecos al recuperarse', async () => {
      const fetchSpy = vi.mocked(global.fetch);
      fetchSpy.mockResolvedValueOnce(serverErrorResponse());

      renderPicker();

      await screen.findByRole('alert');
      const callsBeforeRetry = fetchSpy.mock.calls.length;

      // A partir de aquí el mock por defecto (`beforeEach`) vuelve a
      // responder OK, así que el reintento debe recuperar la rejilla.
      await userEvent.click(screen.getByRole('button', { name: /Reintentar/u }));

      await waitFor(() => {
        expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
      });
      expect(await screen.findByText('Mañana')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
