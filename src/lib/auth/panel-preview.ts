import 'server-only';

import { cookies } from 'next/headers';

/**
 * Nombre y configuración de la cookie que activa el modo "datos de
 * ejemplo" en las páginas del panel del provider.
 *
 * `httpOnly: false` adrede — el toggle es UX puro, no es secreto; queremos
 * que el cliente pueda leerla si en el futuro hace falta para hydration
 * sin parpadeo. `sameSite: lax` evita uso CSRF aunque el riesgo aquí es
 * cero (la cookie no autoriza nada, solo cambia qué datos rendea SSR).
 */
const PANEL_PREVIEW_COOKIE = 'yaiwell.panelPreview';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 año

/**
 * `true` si la cookie está activa. Lectura síncrona pero la API de
 * Next 16 obliga al `await cookies()`. Devolvemos `false` por defecto
 * para que un provider nuevo arranque viendo sus datos reales (que es
 * lo correcto — el preview es opt-in).
 */
export async function isPanelPreviewActive(): Promise<boolean> {
  const store = await cookies();
  return store.get(PANEL_PREVIEW_COOKIE)?.value === '1';
}

/**
 * Escribe la cookie según el flag. `true` → activa preview con maxAge
 * de 1 año; `false` → la elimina del navegador.
 */
export async function setPanelPreviewCookie(active: boolean): Promise<void> {
  const store = await cookies();
  if (active) {
    store.set(PANEL_PREVIEW_COOKIE, '1', {
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
    });
  } else {
    store.delete(PANEL_PREVIEW_COOKIE);
  }
}
