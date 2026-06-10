/**
 * Persistencia del draft del wizard en `sessionStorage`.
 *
 * El draft sobrevive a refrescos de pestaña pero se pierde al cerrar
 * la ventana — buscado: no queremos arrastrar drafts viejos entre
 * sesiones, ni que el usuario vea datos de otra cuenta si comparte
 * navegador. Para persistencia más larga existe el `apiGetState` del
 * servidor.
 *
 * `saveDraft` aplica un debounce de 300 ms para no escribir en cada
 * keystroke. `clearDraft` se llama tras la publicación exitosa para
 * que el wizard quede limpio si el usuario vuelve a `/onboarding`.
 */

import type { OnboardingDraft } from './onboarding.types';

/** Clave única bajo la que vive el draft. La version `.v1` permite migrar en el futuro. */
export const DRAFT_STORAGE_KEY = 'yaiwell.onboarding.draft.v1';

/** Retardo del debounce de `saveDraft` en milisegundos. */
const SAVE_DEBOUNCE_MS = 300;

/** Handle del último `setTimeout` pendiente del debounce. */
let pendingSaveHandle: ReturnType<typeof setTimeout> | null = null;

/**
 * Lee el draft persistido. Devuelve `null` si no hay sesión, no hay
 * draft, o el JSON está corrupto. Pensado para llamarse en el
 * hidratado inicial del wizard.
 */
export function loadDraft(): OnboardingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    // Storage no disponible (incógnito estricto, cuotas, JSON inválido):
    // tratamos como ausencia de draft.
    return null;
  }
}

/**
 * Persiste el draft con debounce. Las llamadas dentro de
 * `SAVE_DEBOUNCE_MS` se colapsan en un único write.
 */
export function saveDraft(draft: OnboardingDraft): void {
  if (typeof window === 'undefined') return;
  if (pendingSaveHandle !== null) {
    clearTimeout(pendingSaveHandle);
  }
  pendingSaveHandle = setTimeout(() => {
    pendingSaveHandle = null;
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Silencioso: si el storage está lleno o bloqueado, el draft se
      // mantiene en memoria — la peor consecuencia es perder el draft
      // al refrescar.
    }
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Borra el draft. Se llama en el éxito final (paso 5) y como reset
 * defensivo al detectar `ONBOARDING_ALREADY_COMPLETE`.
 */
export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  if (pendingSaveHandle !== null) {
    clearTimeout(pendingSaveHandle);
    pendingSaveHandle = null;
  }
  try {
    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Mismo razonamiento que en saveDraft.
  }
}
