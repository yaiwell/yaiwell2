'use client';

import { useElements, useStripe } from '@stripe/react-stripe-js';
import {
  loadStripe,
  type Appearance,
  type Stripe,
  type StripeElementLocale,
} from '@stripe/stripe-js';
import { useCallback, useState, type FormEvent } from 'react';

import {
  verifyBookingPayableAction,
  type BookingPayableActionState,
} from '@/app/[locale]/centro/[slugWithId]/reservar/hold-actions';
import type { AppLocale } from '@/i18n/routing';

import { resolveHoldCheck } from './StripePaymentStep.hold';

/**
 * Lógica del paso de pago con Stripe Elements.
 *
 * Aquí vive todo lo que no es JSX: la carga del SDK, la traducción de
 * nuestro locale al de Stripe, la apariencia del iframe y el submit del
 * formulario.
 */

/**
 * Promesa del SDK cacheada a nivel de módulo.
 *
 * `loadStripe` inyecta un `<script>` en el documento; llamarlo en cada
 * render montaría el SDK varias veces. Al vivir fuera del componente, la
 * promesa se comparte entre montajes del paso de pago (por ejemplo si el
 * usuario va atrás y vuelve).
 */
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Devuelve la promesa del SDK, o `null` si no hay clave publicable
 * configurada.
 *
 * Devolver `null` en vez de lanzar permite que la UI muestre un aviso
 * legible en entornos sin las env de Stripe (preview sin secretos)
 * en lugar de tumbar el árbol de React con un error de cliente.
 */
export function getStripePromise(): Promise<Stripe | null> | null {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) return null;
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

/**
 * Traduce nuestro locale al que entiende Stripe Elements.
 *
 * Stripe no soporta catalán: un usuario en `ca` vería el formulario en
 * inglés si le pasáramos `ca` tal cual. Caemos a `es-ES`, que es el
 * idioma que ese usuario con seguridad entiende y el que ya usa el resto
 * de la ficha del centro.
 */
export function toStripeLocale(locale: AppLocale): StripeElementLocale {
  switch (locale) {
    case 'ca':
    case 'es':
      return 'es-ES';
    case 'en':
      return 'en-GB';
    case 'de':
      return 'de';
  }
}

/**
 * Apariencia del `PaymentElement`.
 *
 * El formulario vive en un iframe de Stripe, así que no hereda nuestras
 * CSS variables: hay que pasarle los valores resueltos. Nos limitamos a
 * radios, tipografía y color de acento — lo justo para que no cante
 * frente al resto del flujo, sin intentar clonar el sistema de diseño
 * dentro de un iframe que no controlamos.
 */
export function buildAppearance(resolvedTheme: 'light' | 'dark'): Appearance {
  return {
    theme: resolvedTheme === 'dark' ? 'night' : 'stripe',
    variables: {
      borderRadius: '12px',
      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      spacingUnit: '4px',
    },
  };
}

/**
 * Estado del formulario de pago.
 *
 * `hasError` va separado de `errorMessage` porque Stripe puede devolver
 * un error sin mensaje legible; en ese caso la UI muestra su propio copy
 * traducido en lugar de un hueco en blanco.
 */
export interface StripePaymentFormState {
  isReady: boolean;
  isProcessing: boolean;
  hasError: boolean;
  errorMessage: string | null;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Hook que confirma el pago del PaymentIntent ya montado en `<Elements>`.
 *
 * Usa `redirect: 'if_required'`: las tarjetas que no piden 3DS se
 * resuelven sin salir de la página y avanzamos al paso de confirmación
 * en sitio. Las que sí lo piden navegan a `returnUrl`, donde una página
 * dedicada lee el estado de la reserva desde BD.
 *
 * Antes de cobrar pregunta al servidor si la reserva sigue reteniendo su
 * franja (`verifyBookingPayableAction`): el formulario puede llevar
 * abierto más de los 30 min de retención. Un intento fallido deja el
 * error de Stripe en pantalla y el botón activo: el cliente puede
 * reintentar con otra tarjeta sobre el mismo PaymentIntent, porque
 * `payment_failed` ya no cancela la reserva.
 *
 * Ojo con lo que este hook **no** hace: no confirma la reserva. El paso
 * a `confirmed` lo dicta el webhook `payment_intent.succeeded`. Aquí sólo
 * decidimos qué pantalla ve el usuario.
 */
export function useStripePaymentForm(args: {
  bookingId: string;
  returnUrl: string;
  onSucceeded: () => void;
  onHoldExpired: () => void;
}): StripePaymentFormState {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { bookingId, returnUrl, onSucceeded, onHoldExpired } = args;

  const submit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!stripe || !elements || isProcessing) return;

      setIsProcessing(true);
      setHasError(false);
      setErrorMessage(null);

      // `error.message` viene localizado por Stripe según el `locale` de
      // Elements, así que es apto para mostrar tal cual. Sin mensaje, la
      // UI usa su copy genérico.
      const fail = (message: string | null) => {
        setHasError(true);
        setErrorMessage(message);
        setIsProcessing(false);
      };

      void (async () => {
        // Validamos el formulario antes de cualquier llamada de red: los
        // wallets (Apple/Google Pay) exigen abrirse dentro del gesto del
        // usuario, y así un dato mal escrito no gasta una comprobación.
        const { error: submitError } = await elements.submit();
        if (submitError) {
          fail(submitError.message ?? null);
          return;
        }

        const decision = resolveHoldCheck(await verifyHold(bookingId));
        if (decision === 'paid') {
          onSucceeded();
          return;
        }
        if (decision === 'expired') {
          onHoldExpired();
          return;
        }

        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
          redirect: 'if_required',
        });
        if (error) {
          fail(error.message ?? null);
          return;
        }

        // `processing` cuenta como éxito de cara al usuario: el cargo
        // está en curso y el webhook confirmará la reserva. Bloquear la
        // pantalla esperando `succeeded` sólo generaría abandono.
        if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
          onSucceeded();
          return;
        }

        // Estados residuales (`requires_payment_method` tras un fallo
        // silencioso, `canceled`): no hay mensaje de Stripe.
        fail(null);
      })();
    },
    [stripe, elements, isProcessing, bookingId, returnUrl, onSucceeded, onHoldExpired],
  );

  return {
    isReady: Boolean(stripe && elements),
    isProcessing,
    hasError,
    errorMessage,
    submit,
  };
}

/**
 * Llama a la comprobación de la retención sin dejar que un fallo de red
 * rompa el pago: `null` equivale a "no se pudo comprobar" (ver
 * `resolveHoldCheck`).
 */
async function verifyHold(bookingId: string): Promise<BookingPayableActionState | null> {
  try {
    return await verifyBookingPayableAction({ bookingId });
  } catch {
    return null;
  }
}
