import 'server-only';

import { cookies } from 'next/headers';

import type { UserRole } from './types';
import { UI_MODE_COOKIE_NAME, type UiMode } from './ui-mode.types';

// Re-export para que callers server-only sigan importando desde aquí.
export { UI_MODE_COOKIE_NAME };
export type { UiMode };

/**
 * Vida de la cookie: 1 año. Es preferencia "sticky" — el usuario espera
 * que la elección sobreviva entre sesiones del navegador.
 */
const UI_MODE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Normaliza un valor `unknown` a `UiMode` válido o `null`.
 */
function sanitizeUiMode(raw: unknown): UiMode | null {
  if (raw === 'client' || raw === 'provider') return raw;
  return null;
}

/**
 * Resuelve el modo efectivo de UI a partir del rol real y la cookie.
 *
 * Reglas:
 *  - `client` real → siempre ve la app como cliente. La cookie se ignora.
 *  - `admin` real → ve la app como cliente fuera de `/admin` (no tiene
 *    panel de proveedor). La cookie se ignora.
 *  - `provider` real → respeta cookie. Si no hay cookie, default a
 *    `provider` para que su primera entrada sea la herramienta de
 *    gestión (uso esperado). Si la cookie dice `client`, lo respeta y
 *    le muestra el marketplace público como un usuario más.
 *
 * Como helper server-only se lee desde `cookies()` directamente, sin
 * que el caller tenga que pasar el header.
 */
export async function getUiMode(role: UserRole): Promise<UiMode> {
  if (role !== 'provider') return 'client';
  const cookieStore = await cookies();
  const raw = cookieStore.get(UI_MODE_COOKIE_NAME)?.value;
  const parsed = sanitizeUiMode(raw);
  // Provider sin cookie → entra primero al modo gestión. Es el camino
  // que espera la primera vez que aterriza tras registrarse.
  return parsed ?? 'provider';
}

/**
 * Escribe la cookie de UI mode. Pensado para usarse desde Server Actions
 * que reciban el modo elegido por el usuario en `/cuenta`.
 *
 * El caller es responsable de comprobar que el usuario tiene rol
 * provider antes de permitir el cambio — un cliente puro no debe poder
 * setear `provider` (no tendría panel real al que ir).
 */
export async function writeUiModeCookie(mode: UiMode): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: UI_MODE_COOKIE_NAME,
    value: mode,
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: UI_MODE_COOKIE_MAX_AGE_SECONDS,
  });
}
