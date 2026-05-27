/**
 * Utilidades para gestionar la preferencia de tema (claro / oscuro / sistema).
 *
 * Persistimos la preferencia en una cookie en lugar de `localStorage` por
 * dos motivos:
 *  - La cookie viaja en la primera petición, lo que permite resolver el
 *    tema en SSR sin parpadeo cuando el visitante ya tiene preferencia.
 *  - CLAUDE.md §6 prohíbe `localStorage`/`sessionStorage` en producción
 *    salvo casos puntuales justificados.
 *
 * El valor "system" deja la decisión al `prefers-color-scheme` del SO.
 * Resolvemos el modo efectivo (claro u oscuro) en cliente con `matchMedia`.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** Nombre de la cookie que persiste la preferencia. */
export const THEME_COOKIE_NAME = 'beauly-theme';

/**
 * Duración de la cookie (1 año). Suficiente para que el usuario no tenga
 * que reelegir tema cada vez que vuelve, sin ser perpetua.
 */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Lista de valores aceptados para validar entradas externas. */
const VALID_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

/**
 * Comprueba si un string arbitrario es una preferencia de tema válida.
 * Útil para validar valores leídos de cookies o de la URL.
 */
export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && VALID_PREFERENCES.includes(value as ThemePreference);
}

/**
 * Lee la preferencia almacenada en `document.cookie`.
 * Solo debe llamarse en cliente; en servidor devuelve `null`.
 */
export function readThemeCookie(): ThemePreference | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  return isThemePreference(value) ? value : null;
}

/**
 * Escribe la preferencia en `document.cookie`.
 * `SameSite=Lax` es suficiente: la cookie no se usa en peticiones
 * cross-site sensibles, solo para mantener la preferencia visual.
 */
export function writeThemeCookie(preference: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const value = encodeURIComponent(preference);
  document.cookie = `${THEME_COOKIE_NAME}=${value}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Resuelve la preferencia "system" consultando el `prefers-color-scheme`
 * del navegador. Para "light" o "dark" devuelve el valor tal cual.
 */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

/**
 * Aplica el tema resuelto al elemento `<html>` añadiendo o quitando la
 * clase `dark`. Es la única manipulación directa del DOM relacionada con
 * el tema y se invoca desde el provider y desde el script anti-FOUC.
 */
export function applyThemeClass(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  // `color-scheme` ayuda a navegadores y formularios nativos a pintar
  // controles (scrollbars, inputs) coherentes con el tema activo.
  root.style.colorScheme = theme;
}
