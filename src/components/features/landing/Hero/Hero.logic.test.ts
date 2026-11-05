import type { FormEvent } from 'react';

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { heroWhenOptions } from './Hero';
import { useHeroSearch } from './Hero.logic';

/**
 * Tests del hook de búsqueda del Hero.
 *
 * Foco: que la URL que se compone sólo lleve parámetros que `/buscar`
 * sepa interpretar, incluido el `?when=` del selector "¿Cuándo?".
 *
 * Mockeamos router y provider de ubicación porque el hook sólo compone
 * URLs; no queremos navegación ni permisos de geolocalización reales.
 */

const pushMock = vi.fn();

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

vi.mock('@/components/shared/UserLocationProvider', () => ({
  useUserLocation: () => ({
    status: 'idle',
    hasRealLocation: false,
    request: vi.fn(),
  }),
}));

vi.mock('@/lib/services/location', () => ({
  readLocationCookie: () => null,
}));

type HeroSearch = ReturnType<typeof useHeroSearch>;

/**
 * Dispara el submit del formulario y devuelve la URL navegada.
 *
 * El handler sólo usa `preventDefault`, así que le pasamos un doble
 * mínimo; el cast evita tener que fabricar un `FormEvent` completo.
 */
function submitAndGetUrl(submit: HeroSearch['handleSubmit']): string {
  act(() => {
    submit({ preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>);
  });
  return pushMock.mock.calls.at(-1)?.[0] as string;
}

beforeEach(() => {
  pushMock.mockReset();
});

describe('selector "¿Cuándo?" del Hero', () => {
  it('ofrece las opciones que /buscar sabe aplicar', () => {
    expect(heroWhenOptions).toEqual(['now', 'today', 'tomorrow', 'this-week', 'any']);
  });

  it('"Ahora" (valor por defecto) produce ?now=1', () => {
    const { result } = renderHook(() => useHeroSearch());

    expect(result.current.draft.when).toBe('now');
    expect(submitAndGetUrl(result.current.handleSubmit)).toBe('/buscar?now=1');
  });

  it('"Cualquier momento" no añade ningún parámetro temporal', () => {
    const { result } = renderHook(() => useHeroSearch());

    act(() => {
      result.current.setWhen('any');
    });

    expect(submitAndGetUrl(result.current.handleSubmit)).toBe('/buscar');
  });

  it.each(['today', 'tomorrow', 'this-week'] as const)('"%s" emite ?when=', (option) => {
    const { result } = renderHook(() => useHeroSearch());

    act(() => {
      result.current.setWhen(option);
    });

    expect(submitAndGetUrl(result.current.handleSubmit)).toBe(`/buscar?when=${option}`);
  });
});

describe('composición de la URL de búsqueda', () => {
  it('combina categoría y momento en una sola query', () => {
    const { result } = renderHook(() => useHeroSearch());

    act(() => {
      result.current.setCategory('manicura-pedicura');
    });

    expect(submitAndGetUrl(result.current.handleSubmit)).toBe(
      '/buscar?cat=manicura-pedicura&now=1',
    );
  });
});
