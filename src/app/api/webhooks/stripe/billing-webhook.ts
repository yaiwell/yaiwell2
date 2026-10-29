import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { BillingProviderNotFoundError, handleBillingEvent } from '@/lib/services/billing';
import {
  notifyPlanDowngraded,
  notifyPlanPaymentFailed,
  scheduleNotification,
} from '@/lib/services/notifications';

/** Respuesta del webhook para eventos de facturación de planes. */
interface BillingWebhookResponse {
  received: true;
  type: string;
  handled: boolean;
  providerId?: string;
}

/**
 * Rama de Stripe Billing del webhook (`checkout.session.completed` de
 * suscripción, `customer.subscription.*`, `invoice.*`). Separada de
 * `route.ts` para que cada fichero se quede en una responsabilidad.
 *
 * Misma política de respuestas que el resto del webhook: 200 si el
 * evento no es de ningún negocio nuestro (reintentar no lo arreglaría) y
 * 500 ante fallos transitorios (BD, Stripe) para que Stripe reintente.
 * Los avisos solo salen en transiciones reales que devuelve el service.
 */
export async function respondToBillingEvent(event: Stripe.Event): Promise<NextResponse> {
  try {
    const result = await handleBillingEvent(event);
    const { providerId, planChanged, paymentFailedKey } = result;
    if (providerId && paymentFailedKey) {
      scheduleNotification(() => notifyPlanPaymentFailed(providerId, paymentFailedKey));
    }
    if (providerId && planChanged?.to === 'free' && planChanged.from !== 'free') {
      const { from } = planChanged;
      scheduleNotification(() => notifyPlanDowngraded(providerId, from));
    }
    return NextResponse.json<BillingWebhookResponse>(
      {
        received: true,
        type: event.type,
        handled: result.handled,
        ...(providerId ? { providerId } : {}),
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof BillingProviderNotFoundError) {
      console.warn(
        `[webhooks/stripe] ${event.type} without a resolvable provider: ${error.message}`,
      );
      return NextResponse.json<BillingWebhookResponse>(
        { received: true, type: event.type, handled: false },
        { status: 200 },
      );
    }
    console.error(`[webhooks/stripe] failed to process ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 });
  }
}
