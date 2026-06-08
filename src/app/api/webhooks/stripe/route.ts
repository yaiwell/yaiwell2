import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  StripeWebhookConfigError,
  StripeWebhookSignatureError,
  verifyStripeWebhook,
} from '@/lib/integrations/stripe';

/**
 * Webhook de Stripe → Yaiwell (stub Fase 0).
 *
 * Verifica la firma del request y devuelve 200 sin tocar BD. Los
 * handlers reales por tipo de evento se cablearán en Fase 1 cuando
 * exista `payments.service` y el flujo de reserva real con Stripe
 * Connect.
 *
 * **Política de respuestas:**
 * - 501 si falta `STRIPE_WEBHOOK_SECRET` — DX local antes de tener
 *   `stripe listen` corriendo o URL pública configurada en el
 *   dashboard.
 * - 400 si falta el header `stripe-signature` o la firma no verifica.
 *   Stripe reintenta con backoff exponencial ante 5xx pero NO reintenta
 *   ante 4xx, así que un 400 corta el bucle para peticiones falsificadas.
 * - 200 para todos los eventos verificados, incluso los que aún no
 *   manejamos — evitamos que Stripe los reintente eternamente. El
 *   payload de respuesta indica `{ received: true, type, handled }`
 *   para que el dashboard de eventos muestre el estado correcto.
 * - 500 solo en errores realmente inesperados.
 *
 * **Eventos esperados en Fase 1** (TODO al cablear `payments.service`):
 *  - `payment_intent.succeeded` → marca booking `pending` → `confirmed`.
 *  - `payment_intent.payment_failed` → notifica al cliente, libera slot.
 *  - `charge.refunded` → cambia booking a `refunded`.
 *  - `account.updated` → sync de onboarding Connect del proveedor.
 *  - `account.application.deauthorized` → bloquea cobros futuros al provider.
 *  - `customer.subscription.*` → estado del plan de suscripción del provider.
 *  - `invoice.payment_failed` → notifica al provider impago plan.
 */
export async function POST(request: NextRequest) {
  // Header `stripe-signature` obligatorio. Sin él ni intentamos pegar
  // al SDK — es señal de que la petición no viene de Stripe.
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  // Body en texto plano: el SDK firma sobre el cuerpo exacto en bytes.
  const rawBody = await request.text();

  let event;
  try {
    event = verifyStripeWebhook(rawBody, signature);
  } catch (error) {
    if (error instanceof StripeWebhookConfigError) {
      return NextResponse.json({ error: error.message }, { status: 501 });
    }
    if (error instanceof StripeWebhookSignatureError) {
      // No logueamos el body para no filtrar PII / detalles de pago en
      // logs. Stripe nunca debería pegar con firma inválida; si pasa,
      // alguien está probando el endpoint a mano.
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  // En Fase 0 solo registramos que el evento llegó verificado. Cuando
  // se cablee `payments.service`, este switch crecerá con casos
  // dedicados por tipo de evento.
  return NextResponse.json(
    {
      received: true,
      type: event.type,
      handled: false,
    },
    { status: 200 },
  );
}
