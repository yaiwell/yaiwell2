'use client';

import { useEffect, useState } from 'react';

/**
 * Cada cuánto avanza el reloj del flujo de reserva. Medio minuto basta:
 * los umbrales que vigila son de 30 min (antelación mínima) y 2 h
 * (última hora), y solo buscamos que la UI no se quede desfasada si el
 * usuario se queda mirando la pantalla.
 */
export const BOOKING_CLOCK_INTERVAL_MS = 30_000;

/**
 * "Ahora" que avanza solo, para derivar en render datos que dependen del
 * reloj (huecos caducados, reserva de última hora) sin llamar a
 * `new Date()` durante el render.
 *
 * @param fixedNow — instante fijo para tests; si se pasa, no hay intervalo.
 * @param enabled — permite apagar el intervalo cuando no hay nada que vigilar.
 * @returns el instante actual, refrescado cada `BOOKING_CLOCK_INTERVAL_MS`.
 */
export function useTickingNow(fixedNow?: Date, enabled = true): Date {
  const [tick, setTick] = useState<Date>(() => fixedNow ?? new Date());

  useEffect(() => {
    if (fixedNow || !enabled) return;
    const refresh = () => setTick(new Date());
    // Refresco inmediato (asíncrono) al activarse: el valor inicial es del
    // montaje y el usuario puede llevar minutos en la pantalla.
    const first = setTimeout(refresh, 0);
    const handle = setInterval(refresh, BOOKING_CLOCK_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(handle);
    };
  }, [fixedNow, enabled]);

  return fixedNow ?? tick;
}
