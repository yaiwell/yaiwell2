import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests del paso 2 — datos del negocio.
 *
 * Cubren tres escenarios mínimos:
 *  1. Slug autogenerado al hacer blur del nombre.
 *  2. Estado `taken` cuando `apiCheckSlug` devuelve `{ available: false }`.
 *  3. Estado `invalid` cuando el slug no cumple el regex.
 */

// `vi.importActual` requiere el tipo del módulo real. Lo importamos como
// type-only namespace para que la regla `consistent-type-imports` no se
// queje del `typeof import(...)` inline.
import type * as SharedModule from '../../shared';

const apiCheckSlugMock = vi.fn();
vi.mock('../../shared', async () => {
  const actual = await vi.importActual<typeof SharedModule>('../../shared');
  return {
    ...actual,
    apiCheckSlug: (...args: unknown[]) => apiCheckSlugMock(...args),
  };
});

import { BusinessDataStep } from './BusinessDataStep';
import type { BusinessDataValue, SlugStatus } from './BusinessDataStep.types';

const messages = {
  onboarding: {
    businessData: {
      title: 'Datos del negocio',
      subtitle: 'Datos públicos.',
      fields: {
        businessName: 'Nombre del negocio',
        businessNamePlaceholder: 'Studio Aura',
        vatNumber: 'NIF / CIF',
        vatNumberHelp: 'Uso interno.',
        description: 'Descripción',
        descriptionHelp: 'Máx. 280.',
        descriptionCharCount: '{count}/{max}',
        slug: 'URL pública',
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
    common: {
      requiredField: 'Campo obligatorio',
    },
  },
} as const;

function setup(initial?: Partial<BusinessDataValue>) {
  let value: BusinessDataValue = {
    businessName: '',
    slug: '',
    vatNumber: '',
    description: '',
    priceRange: undefined,
    ...initial,
  };
  let slugStatus: SlugStatus = 'idle';

  // Declaramos `utils` con `let` antes de asignarlo: los callbacks de
  // `onChange/onSlugStatusChange` pueden dispararse durante el render
  // inicial (useEffect del logic), y el binding debe existir aunque su
  // valor real llegue después del `render()`.
  // eslint-disable-next-line prefer-const
  let utils: ReturnType<typeof render> | undefined;

  const onChange = vi.fn((patch: Partial<BusinessDataValue>) => {
    value = { ...value, ...patch };
    rerender();
  });
  const onSlugStatusChange = vi.fn((next: SlugStatus) => {
    slugStatus = next;
    rerender();
  });

  function rerender() {
    if (!utils) return;
    utils.rerender(
      <NextIntlClientProvider locale="es" messages={messages}>
        <BusinessDataStep
          value={value}
          onChange={onChange}
          slugStatus={slugStatus}
          onSlugStatusChange={onSlugStatusChange}
        />
      </NextIntlClientProvider>,
    );
  }

  utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <BusinessDataStep
        value={value}
        onChange={onChange}
        slugStatus={slugStatus}
        onSlugStatusChange={onSlugStatusChange}
      />
    </NextIntlClientProvider>,
  );

  return { onChange, onSlugStatusChange, getValue: () => value, getStatus: () => slugStatus };
}

describe('BusinessDataStep', () => {
  beforeEach(() => {
    apiCheckSlugMock.mockReset();
    apiCheckSlugMock.mockResolvedValue({ data: { available: true } });
  });

  it('genera el slug a partir del nombre al hacer blur', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    const nameInput = screen.getByLabelText('Nombre del negocio');
    await user.type(nameInput, 'Studio Aura');
    await user.tab();
    await waitFor(() => {
      // Tras el blur, el `onChange` recibe un patch con slug derivado.
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ slug: 'studio-aura' }));
    });
  });

  it('marca el slug como `taken` cuando el endpoint dice no disponible', async () => {
    apiCheckSlugMock.mockResolvedValue({ data: { available: false } });
    const { onSlugStatusChange } = setup({ slug: 'studio-aura' });
    await waitFor(
      () => {
        expect(onSlugStatusChange).toHaveBeenCalledWith('taken');
      },
      { timeout: 1000 },
    );
  });

  it('marca el slug como `invalid` cuando rompe el regex', async () => {
    const { onSlugStatusChange } = setup({ slug: '--invalid--' });
    await waitFor(() => {
      expect(onSlugStatusChange).toHaveBeenCalledWith('invalid');
    });
  });
});
