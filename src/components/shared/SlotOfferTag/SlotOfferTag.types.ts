import type { ProviderSlotOffer } from '@/types/domain';

/**
 * Props de la etiqueta «Hueco liberado · −20 % · 17:00».
 */
export interface SlotOfferTagProps {
  /** Mejor hueco liberado del centro (`bestOffer` del buscador o de la ficha). */
  offer: ProviderSlotOffer;
  /** Segmento `{slug}-{id}` del centro, para enlazar a su flujo de reserva. */
  providerSlugWithId: string;
  /** `overlay` sobre una foto (card, popup); `inline` en la ficha. */
  variant?: 'overlay' | 'inline';
  /** Instante de referencia para decidir «hoy»; inyectable en tests. */
  now?: Date;
  dataComponent?: string;
}
