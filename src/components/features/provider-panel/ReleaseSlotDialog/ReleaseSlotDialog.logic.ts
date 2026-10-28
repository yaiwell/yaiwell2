'use client';

import { useMemo, useState, useTransition } from 'react';

import {
  releaseCancelledSlotAction,
  releaseFreeSlotAction,
  type SlotOfferActionCode,
} from '@/app/[locale]/panel/calendario/slot-offers.actions';
import {
  MAX_SLOT_OFFER_DISCOUNT_PCT,
  SLOT_OFFER_DISCOUNT_STEP_PCT,
  areValidSlotOfferDiscounts,
  getSlotOfferTier,
  type SlotOfferDiscounts,
} from '@/lib/utils/slot-offer-pricing';

import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';
import type { DiscountIssue, DiscountTier, ReleaseSlotTarget } from './ReleaseSlotDialog.types';

/**
 * Descuentos propuestos por defecto. Escalan con la cercanía de la hora
 * y se quedan lejos del tope: el profesional decide si quiere más.
 */
export const DEFAULT_DISCOUNTS: Record<ReleaseSlotTarget['kind'], SlotOfferDiscounts> = {
  cancelled: { over2h: 10, oneToTwoHours: 20, underOneHour: 30 },
  // Un hueco libre empieza en menos de 2 h: ese tramo no aplica y va a 0.
  free: { over2h: 0, oneToTwoHours: 20, underOneHour: 30 },
};

/** Tramos que se piden en cada modo, del más lejano al más cercano. */
export function getTiersForTarget(kind: ReleaseSlotTarget['kind']): DiscountTier[] {
  return kind === 'free'
    ? ['oneToTwoHours', 'underOneHour']
    : ['over2h', 'oneToTwoHours', 'underOneHour'];
}

/** Mínimo de cada tramo: el más cercano siempre rebaja algo. */
export function getTierMin(tier: DiscountTier): number {
  return tier === 'underOneHour' ? SLOT_OFFER_DISCOUNT_STEP_PCT : 0;
}

/** Sube o baja un tramo un paso de 5, sin salirse de [mínimo, 50]. */
export function stepDiscount(value: number, direction: 1 | -1, tier: DiscountTier): number {
  const next = value + direction * SLOT_OFFER_DISCOUNT_STEP_PCT;
  return Math.min(MAX_SLOT_OFFER_DISCOUNT_PCT, Math.max(getTierMin(tier), next));
}

/**
 * Explica por qué unos tramos no son válidos, o `null` si lo son.
 *
 * La regla la decide `areValidSlotOfferDiscounts` (la misma que aplican
 * el service y el CHECK de BD); aquí solo elegimos el mensaje.
 */
export function getDiscountIssue(d: SlotOfferDiscounts): DiscountIssue | null {
  if (areValidSlotOfferDiscounts(d)) return null;
  if (d.underOneHour < SLOT_OFFER_DISCOUNT_STEP_PCT) return 'underOneHourMin';
  if (d.over2h > d.oneToTwoHours || d.oneToTwoHours > d.underOneHour) return 'decreasing';
  return 'outOfRange';
}

/** Tramos que se envían: en un hueco libre, el de más de 2 h siempre a 0. */
export function toSubmittedDiscounts(
  kind: ReleaseSlotTarget['kind'],
  d: SlotOfferDiscounts,
): SlotOfferDiscounts {
  return kind === 'free' ? { ...d, over2h: 0 } : d;
}

/** Clave i18n (`slotOffers.errors.*`) de un error de la action. */
export type SlotOfferErrorKey =
  | 'invalidInput'
  | 'notFound'
  | 'forbidden'
  | 'notCancelled'
  | 'slotTaken'
  | 'outsideWindow'
  | 'alreadyExists'
  | 'serviceInvalid'
  | 'internal';

/** Clave i18n de cada código de la action. */
export const SLOT_OFFER_ERROR_KEYS: Record<SlotOfferActionCode, SlotOfferErrorKey> = {
  INVALID_INPUT: 'invalidInput',
  NOT_FOUND: 'notFound',
  FORBIDDEN: 'forbidden',
  NOT_CANCELLED: 'notCancelled',
  SLOT_TAKEN: 'slotTaken',
  OUTSIDE_WINDOW: 'outsideWindow',
  ALREADY_EXISTS: 'alreadyExists',
  SERVICE_INVALID: 'serviceInvalid',
  INTERNAL: 'internal',
};

/**
 * Estado del formulario de liberar un hueco: tramos, validación en vivo,
 * envío a la action que toca según el modo y resultado.
 *
 * El tramo vigente se calcula con el reloj del navegador solo como
 * orientación («Ahora»); el % que se cobra lo decide el servidor.
 */
export function useReleaseSlotForm(target: ReleaseSlotTarget, locale: SupportedLocale) {
  const [discounts, setDiscounts] = useState<SlotOfferDiscounts>(DEFAULT_DISCOUNTS[target.kind]);
  const [errorKey, setErrorKey] = useState<SlotOfferErrorKey | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  // El diálogo solo se monta tras una interacción: leer el reloj aquí no
  // provoca desajustes de hidratación.
  const [currentTier] = useState<DiscountTier>(() =>
    getSlotOfferTier(new Date(target.startAtIso), new Date()),
  );

  const tiers = useMemo(() => getTiersForTarget(target.kind), [target.kind]);
  const submitted = toSubmittedDiscounts(target.kind, discounts);
  const issue = getDiscountIssue(submitted);

  function step(tier: DiscountTier, direction: 1 | -1) {
    setErrorKey(null);
    setDiscounts((prev) => ({ ...prev, [tier]: stepDiscount(prev[tier], direction, tier) }));
  }

  function submit() {
    if (issue) return;
    setErrorKey(null);
    startTransition(async () => {
      const result =
        target.kind === 'cancelled'
          ? await releaseCancelledSlotAction(locale, {
              bookingId: target.bookingId,
              discounts: submitted,
            })
          : await releaseFreeSlotAction(locale, {
              serviceId: target.serviceId,
              startAtIso: target.startAtIso,
              discounts: submitted,
            });
      if (result.ok) {
        setDone(true);
        return;
      }
      setErrorKey(SLOT_OFFER_ERROR_KEYS[result.code]);
    });
  }

  return { tiers, discounts, currentTier, issue, errorKey, done, isPending, step, submit };
}
