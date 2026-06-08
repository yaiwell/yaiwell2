import Stripe from 'stripe';

/**
 * Cliente Stripe singleton para uso en server-side.
 *
 * Inicialización perezosa: instanciamos el cliente solo la primera vez
 * que alguien lo pide. Esto permite que el build de Next no reviente
 * cuando `STRIPE_SECRET_KEY` no esté presente (por ejemplo en preview
 * builds sin secretos o en CI corriendo lint/typecheck).
 *
 * **Nunca importar este módulo desde Client Components.** La key vive en
 * server-only y exponerla rompería la facturación entera.
 *
 * `apiVersion` se pinea a la última fecha estable que el SDK 22.x soporta
 * para que un cambio en defaults de Stripe no rompa silenciosamente el
 * pinning de tipos. Subir esta fecha es un cambio explícito acompañado
 * de revisión del changelog.
 */

let cached: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cached) return cached;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    // Error explícito en tiempo de uso, no en import. Permite que rutas
    // que no tocan Stripe sigan funcionando aunque la key falte.
    throw new Error('STRIPE_SECRET_KEY no está configurado.');
  }

  cached = new Stripe(apiKey, {
    apiVersion: '2026-05-27.dahlia',
    typescript: true,
    // Telemetría desactivada — no enviamos métricas anónimas a Stripe
    // sobre uso del SDK; respeto a privacidad del usuario y reducción
    // de latencia en cold start.
    telemetry: false,
    appInfo: {
      name: 'Yaiwell',
      url: 'https://yaiwell.com',
    },
  });

  return cached;
}

/**
 * Helper interno para tests: limpia el singleton para que cada test
 * pueda forzar una re-inicialización con env distinto.
 */
export function __resetStripeClientForTests() {
  cached = null;
}
