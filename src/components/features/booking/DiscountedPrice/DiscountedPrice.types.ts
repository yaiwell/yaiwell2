import type { AppLocale } from '@/i18n/routing';

/**
 * Importe que enseña el flujo de reserva en cada momento (resumen,
 * pago y confirmación). Lo resuelve `BookingFlow.price.ts`.
 */
export interface DisplayedBookingPrice {
  amountCents: number;
  /** Precio de referencia tachado; `null` sin descuento. */
  originalPriceCents: number | null;
  discountPct: number | null;
  /**
   * `true` mientras no existe reserva: el importe es una previsión (el
   * del catálogo o el del hueco con oferta) y el definitivo lo fija el
   * servidor al abrir el pago.
   */
  isEstimate: boolean;
}

/**
 * Props del importe con (o sin) descuento de hueco liberado.
 *
 * Los tres importes llegan ya resueltos: este componente no calcula
 * precios, solo los pinta. Así el número que ve el cliente es siempre
 * el que decidió el servidor (o el previsto del hueco, si aún no hay
 * reserva).
 */
export interface DiscountedPriceProps {
  /** Importe final en céntimos. */
  amountCents: number;
  /** Precio de referencia (el del servicio); `null` sin descuento. */
  originalPriceCents: number | null;
  /** % de descuento; `null` sin descuento. */
  discountPct: number | null;
  locale: AppLocale;
  /** `lg` para la línea de importe del pago; `md` para filas de resumen. */
  size?: 'md' | 'lg';
  dataComponent?: string;
}
