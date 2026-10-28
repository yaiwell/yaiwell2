import 'server-only';

import { after } from 'next/server';

/**
 * Programa un aviso para después de responder. El cliente no espera a
 * Resend y, en Vercel, `after` mantiene viva la función hasta que el
 * envío termina (un `void promise` suelto podría cortarse).
 *
 * Solo vale dentro de una petición: route handlers y server actions.
 */
export function scheduleNotification(task: () => Promise<void>): void {
  try {
    after(task);
  } catch (err) {
    // Fuera de una petición `after` lanza. El cambio de estado ya está
    // guardado: un 500 aquí haría a Stripe reintentar un evento aplicado.
    console.error('[notifications] could not schedule email:', err);
  }
}
