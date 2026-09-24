/**
 * Tests de la pantalla de configuración del centro, centrados en el P0
 * de la dirección: el panel no puede guardar una calle nueva dejando
 * las coordenadas viejas.
 *
 * Mockeamos las server actions (importan `server-only` + Prisma) y el
 * `PhotoUploader` (sube ficheros a storage, irrelevante aquí). El
 * `AddressAutocomplete` sí es el real: es la pieza que resuelve las
 * coordenadas, así que interceptamos su `fetch` al proxy de geocoding.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WeeklySchedule } from '@/lib/services/availability';

const updateSettingsMock = vi.fn();
const updateScheduleMock = vi.fn();

vi.mock('@/app/[locale]/panel/centro/actions', () => ({
  updateProviderSettingsAction: (...args: unknown[]) => updateSettingsMock(...args),
  updateProviderScheduleAction: (...args: unknown[]) => updateScheduleMock(...args),
  updateProviderPhotosAction: vi.fn(),
}));

vi.mock('@/components/shared/PhotoUploader', () => ({
  PhotoUploader: () => <div data-component="photo-uploader-stub" />,
}));

import { ProviderSettings } from './ProviderSettings';

const messages = {
  common: { comingSoon: 'Próximamente' },
  addressAutocomplete: {
    placeholder: 'Calle, número, ciudad…',
    loading: 'Buscando direcciones…',
    error: 'No se han podido cargar las sugerencias.',
    no_results: 'Sin resultados.',
    clear: 'Borrar dirección',
  },
  providerPanel: {
    settings: {
      title: 'Configuración',
      subtitle: 'Datos de tu negocio',
      general: {
        title: 'Datos generales',
        businessNameLabel: 'Nombre del negocio',
        vatLabel: 'NIF/CIF',
        phoneLabel: 'Teléfono',
        emailLabel: 'Email de contacto',
        descriptionLabel: 'Descripción',
      },
      address: {
        title: 'Dirección',
        streetLabel: 'Calle y número',
        streetHelp: 'Escribe y elige una sugerencia: guardamos también tu ubicación en el mapa.',
        cityLabel: 'Ciudad',
        postalLabel: 'Código postal',
      },
      schedule: {
        title: 'Horario',
        subtitle: 'Cuándo abres',
        openLabel: 'Abierto',
        closedLabel: 'Cerrado',
        closedHint: 'Sin servicio este día.',
        addBlock: 'Añadir tramo',
        toggleAria: 'Abrir o cerrar {day}',
        removeBlockAria: 'Quitar tramo de {day}',
        openFrom: 'Abre',
        openTo: 'Cierra',
        days: {
          monday: 'Lunes',
          tuesday: 'Martes',
          wednesday: 'Miércoles',
          thursday: 'Jueves',
          friday: 'Viernes',
          saturday: 'Sábado',
          sunday: 'Domingo',
        },
      },
      photos: { title: 'Fotos', subtitle: 'Sube fotos', error: 'No se ha podido guardar.' },
      multiBusiness: {
        title: 'Otro negocio',
        description: 'Gestiona varios locales',
        cta: 'Añadir negocio',
      },
      save: {
        button: 'Guardar cambios',
        saving: 'Guardando…',
        success: 'Guardado correctamente.',
        errors: {
          notFound: 'No hemos encontrado tu negocio.',
          locationRequired: 'Elige una dirección de las sugerencias para actualizar tu ubicación.',
          validation: 'Revisa los campos.',
          noProfessional: 'Tu cuenta no tiene un profesional asociado.',
          internal: 'No hemos podido guardar los cambios.',
        },
      },
    },
  },
};

const EMPTY_SCHEDULE: WeeklySchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

/** Dirección y punto actuales en BD (los que el P0 dejaba desfasados). */
const CURRENT_ADDRESS = {
  text: 'Carrer Major 12, Palma',
  lat: 39.5696,
  lng: 2.6502,
};

/** Candidato que devuelve el proxy de geocoding para la calle nueva. */
const NEW_SUGGESTION = {
  id: 'addr.1',
  name: 'Carrer Nou 3',
  fullAddress: 'Carrer Nou 3, 07001 Palma',
  lat: 39.5712,
  lng: 2.6488,
  kind: 'address',
};

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
        <ProviderSettings
          provider={{
            id: 'prov-1',
            businessName: 'Atelier',
            vatNumber: 'B12345678',
            description: { es: 'Descripción' },
            address: CURRENT_ADDRESS,
            photos: [],
          }}
          schedule={EMPTY_SCHEDULE}
          locale="es"
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  updateSettingsMock.mockResolvedValue({ ok: true });
  updateScheduleMock.mockResolvedValue({ ok: true });
});

describe('ProviderSettings — dirección geolocalizada', () => {
  it('envía las coordenadas actuales cuando el usuario no toca la dirección', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn());
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(updateSettingsMock).toHaveBeenCalledOnce());
    expect(updateSettingsMock.mock.calls[0][1]).toMatchObject({
      address: CURRENT_ADDRESS.text,
      lat: CURRENT_ADDRESS.lat,
      lng: CURRENT_ADDRESS.lng,
    });
  });

  it('al elegir una dirección nueva envía SU punto, no el anterior', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [NEW_SUGGESTION] }),
      }),
    );
    renderSettings();

    const input = screen.getByRole('combobox', { name: 'Calle y número' });
    await user.clear(input);
    await user.type(input, 'Carrer Nou 3');

    const option = await screen.findByRole('option', { name: /Carrer Nou 3/ }, { timeout: 3000 });
    await user.click(option);

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(updateSettingsMock).toHaveBeenCalledOnce());
    expect(updateSettingsMock.mock.calls[0][1]).toMatchObject({
      address: NEW_SUGGESTION.fullAddress,
      lat: NEW_SUGGESTION.lat,
      lng: NEW_SUGGESTION.lng,
    });
  });

  it('si el geocoder falla, no se guarda una calle nueva con el punto viejo', async () => {
    const user = userEvent.setup();
    // Mapbox caído: el proxy responde 502 y no hay sugerencias que elegir.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    renderSettings();

    const input = screen.getByRole('combobox', { name: 'Calle y número' });
    await user.clear(input);
    await user.type(input, 'Carrer Nou 3');

    expect(
      await screen.findByText('No se han podido cargar las sugerencias.', undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    // Lo que el usuario tecleó sin confirmar NO viaja al servidor: se
    // reenvía la dirección vigente con su punto. Nunca queda la calle
    // nueva apuntando a las coordenadas antiguas.
    await waitFor(() => expect(updateSettingsMock).toHaveBeenCalledOnce());
    expect(updateSettingsMock.mock.calls[0][1]).toMatchObject({
      address: CURRENT_ADDRESS.text,
      lat: CURRENT_ADDRESS.lat,
      lng: CURRENT_ADDRESS.lng,
    });
  });

  it('muestra el copy de LOCATION_REQUIRED si el servidor rechaza por falta de coordenadas', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn());
    updateSettingsMock.mockResolvedValue({ ok: false, code: 'LOCATION_REQUIRED' });
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText(
        'Elige una dirección de las sugerencias para actualizar tu ubicación.',
      ),
    ).toBeInTheDocument();
  });
});
