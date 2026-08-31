import type { CheckoutErrorCode } from '@/app/[locale]/centro/[slugWithId]/reservar/actions';
import type { AppLocale } from '@/i18n/routing';
import type { Provider, Service } from '@/types/domain';

/**
 * Tipos específicos del orquestador del flujo de reserva.
 *
 * Los datos del proveedor y del servicio se reciben ya resueltos desde
 * el Server Component padre (la página) para que el cliente no tenga
 * que hacer fetch ni asumir formato BD.
 */

/**
 * Pasos del flujo. El orden es relevante: cada paso permite avanzar
 * al siguiente y volver atrás (salvo desde la confirmación, que es final).
 */
export type BookingStep = 'slot' | 'summary' | 'payment' | 'confirmation';

/**
 * Estado acumulado del flujo de reserva. Se va completando paso a paso.
 * `slotStartIso`/`slotEndIso` se guardan como strings para que el draft
 * sea trivialmente serializable y comparable entre renders.
 */
export interface BookingDraft {
  slotStartIso: string | null;
  slotEndIso: string | null;
  notes: string;
  /** Id real de la reserva creada en BD al abrir el checkout. */
  bookingId: string | null;
}

/**
 * Estado del checkout de Stripe dentro del flujo.
 *
 * Es una máquina de estados explícita en vez de un par de booleanos:
 * `creating` y `error` pintan pantallas distintas, y `ready` es la única
 * que puede montar Elements porque necesita el `clientSecret`.
 */
export type CheckoutState =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'ready'; clientSecret: string; amountCents: number }
  | { status: 'error'; code: CheckoutErrorCode };

/**
 * Props del componente raíz del flujo de reserva.
 */
export interface BookingFlowProps {
  provider: Provider;
  service: Service;
  locale: AppLocale;
  /** Segmento `{slug}-{id}` para construir el enlace de vuelta a la ficha. */
  providerSlugWithId: string;
}
