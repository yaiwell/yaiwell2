import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import {
  StripeWebhookConfigError,
  StripeWebhookSignatureError,
  verifyStripeWebhook,
} from '@/lib/integrations/stripe';
import {
  BookingForCheckoutNotFoundError,
  MissingBookingReferenceError,
  confirmBookingPayment,
  failBookingPayment,
  refundBookingPayment,
} from '@/lib/services/checkout';

/**
 * Webhook de Stripe → Yaiwell.
 *
 * Es la **única** vía por la que una reserva pasa a `confirmed`: el
 * navegador nunca confirma nada. Si el cliente cierra la pestaña justo
 * tras pagar, la reserva se confirma igual porque el estado lo dicta
 * este endpoint, no la UI.
 *
 * **Política de respuestas** (importa: define si Stripe reintenta):
 * - 501 si falta `STRIPE_WEBHOOK_SECRET` — DX local antes de tener
 *   `stripe listen` corriendo o URL pública configurada.
 * - 400 si falta el header `stripe-signature` o la firma no verifica.
 *   Stripe no reintenta ante 4xx, así que corta el bucle para
 *   peticiones falsificadas.
 * - 200 para eventos verificados, tanto los que manejamos como los que
 *   no. `handled` en el payload distingue ambos casos sin provocar
 *   reintentos eternos.
 * - 500 sólo ante fallos transitorios nuestros (BD caída): es la señal
 *   para que Stripe reintente con backoff y no perdamos el evento.
 *
 * **Eventos aún sin cablear** (llegan como `handled: false`):
 *  - `account.updated` → sync del onboarding Connect del proveedor.
 *  - `account.application.deauthorized` → bloquear cobros futuros.
 *  - `customer.subscription.*` / `invoice.payment_failed` → planes.
 */

/** Eventos que este endpoint transforma en cambios de estado. */
const HANDLED_EVENTS = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
] as const;

interface WebhookResponse {
  received: true;
  type: string;
  handled: boolean;
  /** Presente sólo cuando el evento movió una reserva. */
  bookingId?: string;
  status?: string;
}

export async function POST(request: NextRequest) {
  // Header `stripe-signature` obligatorio. Sin él ni intentamos pegar al
  // SDK — es señal de que la petición no viene de Stripe.
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  // Body en texto plano: el SDK firma sobre el cuerpo exacto en bytes.
  const rawBody = await request.text();

  let event: Stripe.Event;
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

  if (!isHandledEvent(event.type)) {
    return NextResponse.json<WebhookResponse>(
      { received: true, type: event.type, handled: false },
      { status: 200 },
    );
  }

  try {
    const result = await dispatch(event);
    return NextResponse.json<WebhookResponse>(
      {
        received: true,
        type: event.type,
        handled: result.changed,
        bookingId: result.bookingId,
        status: result.status,
      },
      { status: 200 },
    );
  } catch (error) {
    // El evento es válido pero no apunta a ninguna reserva nuestra
    // (reproceso entre entornos, pago ajeno al marketplace). Reintentarlo
    // no lo arreglaría: 200 para que Stripe lo dé por entregado.
    if (
      error instanceof BookingForCheckoutNotFoundError ||
      error instanceof MissingBookingReferenceError
    ) {
      console.warn(`[webhooks/stripe] ${event.type} sin reserva resoluble: ${error.message}`);
      return NextResponse.json<WebhookResponse>(
        { received: true, type: event.type, handled: false },
        { status: 200 },
      );
    }

    // Cualquier otro fallo se asume transitorio (BD, red). 500 para que
    // Stripe reintente: perder un `succeeded` deja una reserva pagada en
    // `pending`, que es el peor estado posible.
    console.error(`[webhooks/stripe] error procesando ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 });
  }
}

/**
 * Type guard sobre la lista de eventos cableados. Mantenerlo separado
 * permite que el `switch` de `dispatch` sea exhaustivo sin castear.
 */
function isHandledEvent(type: string): type is (typeof HANDLED_EVENTS)[number] {
  return (HANDLED_EVENTS as readonly string[]).includes(type);
}

/**
 * Enruta el evento al handler del dominio checkout.
 *
 * El route handler no contiene lógica de negocio: sólo traduce el tipo
 * de evento a la llamada correspondiente y deja que el service decida
 * qué transición aplica.
 */
async function dispatch(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      return confirmBookingPayment(event.data.object);
    case 'payment_intent.payment_failed':
      return failBookingPayment(event.data.object);
    case 'charge.refunded':
      return refundBookingPayment(event.data.object);
    default:
      // Inalcanzable: `isHandledEvent` filtra antes de llegar aquí.
      throw new Error(`Evento no cableado: ${event.type}`);
  }
}
