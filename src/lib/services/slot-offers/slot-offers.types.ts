/**
 * Tipos del dominio de huecos liberados con descuento.
 */
import type { SlotOfferDiscounts } from '@/lib/utils/slot-offer-pricing';

/** Estado guardado. «Vendida» y «caducada» se derivan al leer. */
export type SlotOfferStatus = 'active' | 'withdrawn';

/** Oferta reservable ahora: activa, sin caducar y con el hueco libre. */
export interface LiveSlotOffer {
  id: string;
  providerId: string;
  professionalId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  expiresAt: Date;
  discounts: SlotOfferDiscounts;
}

/** Resumen para pintar una oferta en listados (tarjeta, ficha, mapa). */
export interface SlotOfferSummary {
  offerId: string;
  serviceId: string;
  startAtIso: string;
  /** % vigente ahora (siempre > 0: sin rebaja no se anuncia). */
  discountPct: number;
}

/** Hueco libre en las próximas 2 h que el profesional puede liberar. */
export interface ReleasableFreeSlot {
  serviceId: string;
  startAtIso: string;
  endAtIso: string;
}
