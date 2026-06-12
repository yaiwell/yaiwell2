'use server';

import { revalidatePath } from 'next/cache';

import type { AppLocale } from '@/i18n/routing';
import { isPanelPreviewActive, setPanelPreviewCookie } from '@/lib/auth/panel-preview';

/**
 * Server action que invierte el flag de modo "datos de ejemplo" del
 * panel. Se invoca desde cualquiera de las 3 páginas que lo soportan
 * (resumen, calendario, valoraciones) — el estado es compartido entre
 * las tres.
 *
 * Tras escribir la cookie, invalida los 3 path para que el siguiente
 * render del SSR vea el flag actualizado. Sin esto, la página visible
 * mostraría el estado anterior hasta una navegación dura.
 */
export async function togglePanelPreviewAction(locale: AppLocale): Promise<void> {
  const current = await isPanelPreviewActive();
  await setPanelPreviewCookie(!current);
  revalidatePath(`/${locale}/panel`);
  revalidatePath(`/${locale}/panel/calendario`);
  revalidatePath(`/${locale}/panel/valoraciones`);
}
