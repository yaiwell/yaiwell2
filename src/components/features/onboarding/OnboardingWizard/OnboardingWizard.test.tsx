import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests del orquestador `OnboardingWizard`.
 *
 * Cubren:
 *  1. Render del paso correcto a partir del `initialState`.
 *  2. Hidratación desde `apiState` con providerId avanzado.
 *  3. Deshabilitado de "Next" hasta que el paso es válido.
 *  4. Persistencia del draft en sessionStorage al cambiar campos.
 */

const pushMock = vi.fn();
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  Link: ({ children, ...rest }: ComponentProps<'a'>) => <a {...rest}>{children}</a>,
}));

vi.mock('../shared/onboarding.api', () => ({
  apiCheckSlug: vi.fn(async () => ({ data: { available: true } })),
  apiCreateProvider: vi.fn(async () => ({ data: { providerId: 'new-provider-id' } })),
  apiCreateFirstService: vi.fn(async () => ({ data: { serviceId: 'svc-1' } })),
  apiSelectPlan: vi.fn(async () => ({ data: {} })),
  apiGetState: vi.fn(async () => ({
    data: {
      providerId: null,
      step: 1,
      hasPhotos: false,
      hasFirstService: false,
      planTier: null,
    },
  })),
}));

import { OnboardingWizard } from './OnboardingWizard';
import type { OnboardingWizardProps } from './OnboardingWizard.types';
import { DRAFT_STORAGE_KEY } from '../shared';

// Mensajes mínimos para que `useTranslations` no falle. Solo las
// claves que el test alcanza.
const messages = {
  onboarding: {
    badge: 'Alta de centro',
    backHome: 'Volver',
    stepper: {
      step1: 'Tipo',
      step2: 'Datos',
      step3: 'Ubicación',
      step4: 'Categoría',
      step5: 'Confirmación',
      current: 'Paso {current} de {total}',
    },
    common: {
      next: 'Siguiente',
      back: 'Atrás',
      saving: 'Guardando…',
      saveAndContinue: 'Continuar',
      publishCta: 'Publicar',
      skipForNow: 'Saltar',
      requiredField: 'Campo obligatorio',
    },
    syncing: {
      title: 'Sincronizando',
      subtitle: 'Esperando webhook…',
      retry: 'Reintentar',
    },
    businessType: {
      title: '¿Cómo trabajas?',
      subtitle: 'Elige el tipo.',
      autonomo: { title: 'Autónomo', description: 'Por mi cuenta.' },
      centro: { title: 'Centro', description: 'Varios profesionales.' },
    },
    businessData: {
      title: 'Datos',
      subtitle: 'Datos públicos.',
      fields: {
        businessName: 'Nombre',
        businessNamePlaceholder: 'Aura',
        vatNumber: 'NIF',
        vatNumberHelp: 'Uso interno.',
        description: 'Descripción',
        descriptionHelp: 'Máx 280.',
        descriptionCharCount: '{count}/{max}',
        slug: 'URL',
        slugPrefix: 'yaiwell.com/centro/',
        slugHelp: 'Solo minúsculas.',
        slugAvailable: 'Disponible',
        slugTaken: 'Ya está cogida.',
        slugChecking: 'Comprobando…',
        slugInvalid: 'Formato no válido.',
        priceRange: 'Rango',
        priceRangeHelp: 'Orientación.',
      },
    },
    location: {
      title: 'Ubicación',
      subtitle: 'Dirección.',
      addressLabel: 'Dirección',
      locationMissing: 'Selecciona una sugerencia.',
      mapHint: 'Usaremos esta dirección.',
    },
    categoriesService: {
      title: 'Categoría',
      subtitle: 'Categoría y servicio.',
      categoriesLabel: 'Categoría',
      service: {
        title: 'Primer servicio',
        name: 'Nombre',
        namePlaceholder: 'Corte',
        duration: 'Duración',
        durationMinutes: '{minutes} min',
        priceEuros: 'Precio',
        priceFreeHint: '0 si consulta.',
      },
    },
    confirm: {
      title: 'Resumen',
      subtitle: 'Revisa.',
      sections: { business: 'Negocio', location: 'Ubicación', service: 'Servicio' },
      termsLabel: 'Acepto términos.',
      publishing: 'Publicando…',
      successToast: 'Centro publicado.',
    },
    errors: {
      UNAUTHORIZED: 'No autorizado',
      USER_NOT_SYNCED: 'Sincronizando',
      INVALID_BODY: 'Datos no válidos',
      SLUG_ALREADY_TAKEN: 'URL ya cogida',
      ONBOARDING_ALREADY_COMPLETE: 'Ya completado',
      PROVIDER_FOR_ONBOARDING_NOT_FOUND: 'No encontrado',
      CATEGORY_NOT_FOUND: 'Categoría no encontrada',
      PLAN_TIER_NOT_FOUND: 'Plan no encontrado',
      FREE_PLAN_NOT_SEEDED: 'Plan no sembrado',
      INTERNAL: 'Error interno',
      NETWORK: 'Sin red',
    },
  },
  addressAutocomplete: {
    placeholder: 'Calle…',
    loading: 'Buscando…',
    error: 'Error',
    no_results: 'Sin resultados',
    clear: 'Borrar',
  },
} as const;

// Tipamos explícitamente como `OnboardingWizardProps` para que los
// overrides parciales en los tests puedan asignar otros pasos o
// providerId sin chocar con tipos literales (`1 as const`, `null`).
const baseProps: OnboardingWizardProps = {
  initialState: {
    providerId: null,
    step: 1,
    hasPhotos: false,
    hasFirstService: false,
    planTier: null,
  },
  categoriesPreloaded: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'belleza',
      name: { es: 'Belleza', ca: 'Bellesa' },
      icon: 'Scissors',
    },
  ],
  locale: 'es',
  userPending: false,
};

function renderWizard(overrides?: Partial<typeof baseProps>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <OnboardingWizard {...baseProps} {...overrides} />
    </NextIntlClientProvider>,
  );
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    pushMock.mockReset();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('renderiza el paso 1 al arrancar limpio', async () => {
    renderWizard();
    expect(await screen.findByRole('heading', { name: '¿Cómo trabajas?' })).toBeInTheDocument();
  });

  it('arranca en el paso 4 si el apiState indica que ya hay providerId avanzado', async () => {
    renderWizard({
      initialState: {
        providerId: 'existing-provider',
        step: 4,
        hasPhotos: false,
        hasFirstService: false,
        planTier: null,
      },
    });
    expect(await screen.findByRole('heading', { name: 'Categoría' })).toBeInTheDocument();
  });

  it('deshabilita el botón Next hasta seleccionar un tipo de negocio', async () => {
    const user = userEvent.setup();
    renderWizard();
    const next = await screen.findByTestId('onboarding-next');
    expect(next).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /Autónomo/ }));
    await waitFor(() => expect(next).not.toBeDisabled());
  });

  it('persiste el draft en sessionStorage al elegir el tipo de negocio', async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(await screen.findByRole('radio', { name: /Centro/ }));
    await waitFor(() => {
      const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
      expect(raw).not.toBeNull();
      expect(raw).toMatch(/"businessType":"centro"/);
    });
  });
});
