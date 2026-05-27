'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  applyThemeClass,
  readThemeCookie,
  resolveTheme,
  writeThemeCookie,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/utils/theme';

/**
 * Contexto que comparte la preferencia de tema en toda la app cliente.
 *
 * Mantener el estado en un contexto evita que cada toggle gestione su
 * propio estado y desincronice (por ejemplo, si en el futuro mostramos
 * el selector también dentro del MobileNav o del panel del proveedor).
 */
interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Hook de consumo del contexto. Si el componente vive fuera del
 * `ThemeProvider` devuelve un fallback inerte para no romper el render
 * en tests aislados; en producción debería estar siempre dentro.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    preference: 'system',
    resolved: 'light',
    setPreference: () => undefined,
  };
}

interface ThemeProviderProps {
  /**
   * Preferencia inicial leída desde cookie en servidor.
   * Si no se pasa, intentamos leerla en cliente como fallback.
   */
  initialPreference?: ThemePreference;
  children: React.ReactNode;
}

/**
 * Provider del tema. Se encarga de:
 *  - Inicializar la preferencia desde la cookie (precargada en servidor
 *    para que SSR y CSR coincidan en el primer render).
 *  - Sincronizar la clase `dark` en `<html>` cuando cambia la preferencia
 *    o cuando el SO cambia su `prefers-color-scheme` (solo si está en "system").
 *  - Persistir cualquier cambio en la cookie para futuras visitas.
 */
export function ThemeProvider({ initialPreference, children }: ThemeProviderProps) {
  // Resolvemos la preferencia inicial: prop > cookie en cliente > "system".
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => initialPreference ?? readThemeCookie() ?? 'system',
  );

  // Tick que fuerza re-resolver cuando el SO cambia su `prefers-color-scheme`
  // estando en modo "system". Lo incrementamos en el listener para evitar
  // setState derivado durante un effect (cascading renders).
  const [systemTick, setSystemTick] = useState(0);

  // `resolved` se deriva en render. No necesita ser estado porque depende
  // solo de `preference` y de `systemTick` (este último cambia únicamente
  // cuando el SO emite un evento real).
  const resolved: ResolvedTheme = useMemo(
    () => resolveTheme(preference),
    // `systemTick` participa intencionadamente: cuando el SO cambia,
    // queremos recalcular aunque `preference` siga siendo "system".
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preference, systemTick],
  );

  // Side effects: tocar el DOM y persistir la cookie. Mantener estos
  // efectos sin setState evita el patrón cascading que ESLint bloquea.
  useEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

  useEffect(() => {
    writeThemeCookie(preference);
  }, [preference]);

  // Suscripción al cambio de `prefers-color-scheme` solo cuando la
  // preferencia es "system". El listener no toca estado derivado, solo
  // incrementa el tick para que el render recalcule `resolved`.
  useEffect(() => {
    if (preference !== 'system') return;
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemTick((t) => t + 1);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
