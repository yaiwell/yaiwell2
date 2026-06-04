'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';

/**
 * Clave por defecto en sessionStorage para recordar que el banner ha
 * sido descartado en esta sesión.
 *
 * Usamos sessionStorage (no localStorage: ver CLAUDE.md §6) porque el
 * descarte debe ser efímero: si el usuario abre una pestaña nueva o
 * vuelve mañana, volvemos a darle la opción de activar la ubicación.
 */
export const DEFAULT_DISMISS_STORAGE_KEY = 'yaiwell:location-banner-dismissed';

/**
 * Lectura defensiva del flag en sessionStorage.
 *
 * Encapsulada para usarla tanto en `getSnapshot` (cliente) como en
 * `getServerSnapshot` (SSR). Devuelve siempre `false` en servidor
 * para que el primer render coincida y evitemos hydration mismatch:
 * el banner solo puede confirmar el descarte una vez montado en
 * cliente, donde sessionStorage existe.
 */
function readDismissedFlag(storageKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(storageKey) === '1';
  } catch {
    // Si sessionStorage no está disponible (modo privado en algunos
    // navegadores, cookies bloqueadas) tratamos como "no descartado".
    // Es preferible mostrar el banner que romper la navegación.
    return false;
  }
}

/**
 * Subscriptor inerte: el flag solo cambia a través de `dismiss()`,
 * que ya actualiza estado React. No hay otra fuente externa que
 * pueda alterar la clave, así que el callback nunca se invoca.
 */
function subscribeNoop() {
  return () => undefined;
}

/**
 * Hook que gestiona si el usuario ha descartado el banner en esta
 * sesión de navegador.
 *
 * Diseño:
 *  - `useSyncExternalStore` lee sessionStorage en mount sin disparar
 *    cascading renders (evita el lint `react-hooks/set-state-in-effect`).
 *  - `dismiss()` actualiza tanto el storage como un contador interno
 *    para forzar un re-render de los consumidores aunque la lectura
 *    sea la misma referencia primitiva.
 *
 * @param storageKey — clave a usar en sessionStorage.
 * @returns `{ dismissed, dismiss }`.
 */
export function useLocationDismissed(storageKey: string = DEFAULT_DISMISS_STORAGE_KEY) {
  // Contador local: cada `dismiss()` lo incrementa y obliga al
  // `useSyncExternalStore` a volver a leer el snapshot.
  const [bump, setBump] = useState(0);

  const dismissed = useSyncExternalStore(
    subscribeNoop,
    // El parámetro `bump` se pasa para invalidar el snapshot tras un
    // `dismiss()` interno; el linter de React Compiler lo ve como una
    // dependencia legítima.
    () => readDismissedFlag(storageKey) || bump > 0,
    () => false,
  );

  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(storageKey, '1');
      } catch {
        // Mismo razonamiento que en la lectura: silenciamos errores
        // de storage para no comprometer la navegación del usuario.
      }
    }
    setBump((prev) => prev + 1);
  }, [storageKey]);

  return { dismissed, dismiss };
}
