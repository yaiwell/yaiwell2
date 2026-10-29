'use client';

import { useEffect, useState } from 'react';

import { useRouter } from '@/i18n/navigation';

/** Cada cuánto re-renderizamos la página mientras Stripe confirma. */
export const ACTIVATION_POLL_INTERVAL_MS = 3_000;

/**
 * Tope de refrescos (~1 min): pasado ese tiempo dejamos de insistir y
 * el aviso dice que el plan se activará en cuanto Stripe lo confirme.
 */
export const ACTIVATION_MAX_POLLS = 20;

/**
 * Mientras el plan se activa, pide al servidor que vuelva a pintar la
 * página cada ~3 s: la página confirma la sesión de Checkout en cada
 * render y, en cuanto la suscripción existe, deja de pasar
 * `activating` y este efecto se desmonta.
 *
 * @returns `true` si se agotaron los intentos.
 */
export function useCheckoutActivation(active: boolean): boolean {
  const router = useRouter();
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (!active || polls >= ACTIVATION_MAX_POLLS) return;
    const handle = window.setTimeout(() => {
      setPolls((n) => n + 1);
      router.refresh();
    }, ACTIVATION_POLL_INTERVAL_MS);
    return () => window.clearTimeout(handle);
  }, [active, polls, router]);

  return active && polls >= ACTIVATION_MAX_POLLS;
}
