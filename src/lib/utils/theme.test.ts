import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyThemeClass,
  isThemePreference,
  readThemeCookie,
  resolveTheme,
  THEME_COOKIE_NAME,
  writeThemeCookie,
} from './theme';

/**
 * Tests del helper de tema.
 *
 * Cubrimos:
 *  - Validación de strings externos (`isThemePreference`).
 *  - Lectura/escritura de la cookie de preferencia.
 *  - Resolución de "system" según `matchMedia`.
 *  - Aplicación de la clase `dark` al `<html>` y del `color-scheme`.
 */

describe('isThemePreference', () => {
  it('acepta los tres valores válidos', () => {
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('system')).toBe(true);
  });

  it('rechaza valores desconocidos o no string', () => {
    expect(isThemePreference('blue')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
    expect(isThemePreference(42)).toBe(false);
  });
});

describe('cookie helpers', () => {
  beforeEach(() => {
    // Reseteamos la cookie entre tests para evitar fugas.
    document.cookie = `${THEME_COOKIE_NAME}=; path=/; max-age=0`;
  });

  it('escribe y lee la preferencia desde document.cookie', () => {
    writeThemeCookie('dark');
    expect(readThemeCookie()).toBe('dark');

    writeThemeCookie('light');
    expect(readThemeCookie()).toBe('light');
  });

  it('devuelve null si no hay cookie o el valor no es válido', () => {
    expect(readThemeCookie()).toBeNull();

    document.cookie = `${THEME_COOKIE_NAME}=invalid; path=/`;
    expect(readThemeCookie()).toBeNull();
  });
});

describe('resolveTheme', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devuelve el valor explícito para light o dark', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('resuelve "system" según prefers-color-scheme: dark', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(resolveTheme('system')).toBe('dark');
  });

  it('resuelve "system" a light cuando el sistema prefiere claro', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(resolveTheme('system')).toBe('light');
  });
});

describe('applyThemeClass', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  it('añade la clase dark al <html> cuando el tema es dark', () => {
    applyThemeClass('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('quita la clase dark cuando el tema es light', () => {
    document.documentElement.classList.add('dark');
    applyThemeClass('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});
