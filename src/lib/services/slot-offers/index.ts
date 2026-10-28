/**
 * API pública del módulo de huecos liberados con descuento.
 *
 * Solo servidor: arrastra Prisma. El cálculo de precios que comparten
 * servidor y cliente vive en `@/lib/utils/slot-offer-pricing`.
 */
export { releaseCancelledSlot, releaseFreeSlot, withdrawSlotOffer } from './slot-offers.service';
export {
  findLiveOfferForSlot,
  getBestOfferByProvider,
  getLiveOffersForService,
  getOpenOffersForProviderRange,
  listReleasableFreeSlots,
} from './slot-offers.queries';
export { getPricedSlotsForService, type PricedSlot } from './slot-offers.slots';
export {
  SlotOfferAlreadyExistsError,
  SlotOfferForbiddenError,
  SlotOfferNotFoundError,
  SlotOfferOutsideWindowError,
  SlotOfferServiceInvalidError,
  SlotOfferSlotTakenError,
  SlotOfferSourceNotCancelledError,
} from './slot-offers.errors';
export type {
  LiveSlotOffer,
  ReleasableFreeSlot,
  SlotOfferStatus,
  SlotOfferSummary,
} from './slot-offers.types';
