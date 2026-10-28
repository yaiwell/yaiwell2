'use server';

import { revalidatePath } from 'next/cache';
import { hasLocale } from 'next-intl';
import { ZodError } from 'zod';

import { routing, type AppLocale } from '@/i18n/routing';
import {
  SlotOfferAlreadyExistsError,
  SlotOfferForbiddenError,
  SlotOfferNotFoundError,
  SlotOfferOutsideWindowError,
  SlotOfferServiceInvalidError,
  SlotOfferSlotTakenError,
  SlotOfferSourceNotCancelledError,
  releaseCancelledSlot,
  releaseFreeSlot,
  withdrawSlotOffer,
} from '@/lib/services/slot-offers';
import type { SlotOfferDiscounts } from '@/lib/utils/slot-offer-pricing';

import { resolveProviderOwner, type ProviderOwner } from './provider-owner';

/**
 * Códigos opacos de las actions de huecos liberados. El cliente elige
 * el copy localizado; nunca viajan mensajes internos ni de Prisma.
 */
export type SlotOfferActionCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'NOT_CANCELLED'
  | 'SLOT_TAKEN'
  | 'OUTSIDE_WINDOW'
  | 'ALREADY_EXISTS'
  | 'SERVICE_INVALID'
  | 'INTERNAL';

/** Resultado serializable de las actions de huecos liberados. */
export type SlotOfferActionState = { ok: true } | { ok: false; code: SlotOfferActionCode };

/** Entrada de «liberar el hueco de una reserva cancelada». */
export interface ReleaseCancelledSlotActionInput {
  bookingId: string;
  discounts: SlotOfferDiscounts;
}

/** Entrada de «liberar un hueco libre de las próximas 2 h». */
export interface ReleaseFreeSlotActionInput {
  serviceId: string;
  startAtIso: string;
  discounts: SlotOfferDiscounts;
}

/** Errores tipados del dominio y su código opaco. */
const ERROR_CODES: ReadonlyArray<[new (...args: never[]) => Error, SlotOfferActionCode]> = [
  [SlotOfferNotFoundError, 'NOT_FOUND'],
  [SlotOfferForbiddenError, 'FORBIDDEN'],
  [SlotOfferSourceNotCancelledError, 'NOT_CANCELLED'],
  [SlotOfferSlotTakenError, 'SLOT_TAKEN'],
  [SlotOfferOutsideWindowError, 'OUTSIDE_WINDOW'],
  [SlotOfferAlreadyExistsError, 'ALREADY_EXISTS'],
  [SlotOfferServiceInvalidError, 'SERVICE_INVALID'],
];

/** Traduce un error del service a su código opaco. */
function toActionCode(err: unknown): SlotOfferActionCode {
  // La validación Zod vive en el service: un input mal formado (tramos
  // fuera de regla, ids vacíos, fecha inválida) llega aquí como ZodError.
  if (err instanceof ZodError) return 'INVALID_INPUT';
  const match = ERROR_CODES.find(([ErrorClass]) => err instanceof ErrorClass);
  return match ? match[1] : 'INTERNAL';
}

/**
 * Esqueleto común: valida el locale, resuelve al dueño autenticado,
 * ejecuta la operación y revalida el calendario si sale bien.
 */
async function runSlotOfferAction(
  locale: string,
  actionName: string,
  operation: (owner: ProviderOwner) => Promise<unknown>,
): Promise<SlotOfferActionState> {
  if (!hasLocale(routing.locales, locale)) {
    return { ok: false, code: 'INVALID_INPUT' };
  }
  const owner = await resolveProviderOwner(locale);
  if (!owner) {
    return { ok: false, code: 'FORBIDDEN' };
  }

  try {
    await operation(owner);
  } catch (err) {
    const code = toActionCode(err);
    // Solo lo inesperado va al log: los errores de regla son respuestas
    // legítimas (hueco ya ocupado, fuera de ventana…), no incidencias.
    if (code === 'INTERNAL') {
      console.error(`[panel/calendario] ${actionName} error:`, err);
    }
    return { ok: false, code };
  }

  revalidatePath(`/${locale}/panel/calendario`);
  return { ok: true };
}

/**
 * Libera con descuento el hueco que dejó una reserva recién cancelada.
 *
 * La hora y el profesional salen de la reserva en BD, nunca del cliente;
 * el service valida tramos, titularidad, estado y ventana.
 */
export async function releaseCancelledSlotAction(
  locale: AppLocale,
  input: ReleaseCancelledSlotActionInput,
): Promise<SlotOfferActionState> {
  return runSlotOfferAction(locale, 'releaseCancelledSlotAction', (owner) =>
    releaseCancelledSlot({ bookingId: input.bookingId, discounts: input.discounts }, owner.userId),
  );
}

/**
 * Libera con descuento un hueco libre que empieza en menos de 2 h.
 *
 * El `providerId` sale de la sesión, no del cliente: así nadie puede
 * publicar ofertas sobre el horario de otro negocio.
 */
export async function releaseFreeSlotAction(
  locale: AppLocale,
  input: ReleaseFreeSlotActionInput,
): Promise<SlotOfferActionState> {
  return runSlotOfferAction(locale, 'releaseFreeSlotAction', (owner) =>
    releaseFreeSlot(
      { serviceId: input.serviceId, startAt: input.startAtIso, discounts: input.discounts },
      owner.userId,
      owner.providerId,
    ),
  );
}

/** Retira una oferta activa: el hueco vuelve a su precio normal. */
export async function withdrawSlotOfferAction(
  locale: AppLocale,
  offerId: string,
): Promise<SlotOfferActionState> {
  return runSlotOfferAction(locale, 'withdrawSlotOfferAction', (owner) =>
    withdrawSlotOffer({ offerId }, owner.userId),
  );
}
