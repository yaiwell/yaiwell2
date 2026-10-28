-- =========================================================================
-- Migración 9b: huecos liberados con descuento (slot_offers)
-- =========================================================================
--
-- Reglas de producto en CLAUDE.md §4.bis («Huecos liberados con
-- descuento», decidido 2026-10-28):
-- - El profesional libera un hueco tras cancelar una reserva
--   (`sourceBookingId`) o sobre un hueco libre a menos de 2 h.
-- - Descuento por tramos de tiempo antes del inicio (> 2 h, 1-2 h,
--   < 1 h), en pasos de 5 %, tope 50 %, y nunca menor en un tramo más
--   cercano. El servidor resuelve el % vigente al crear la reserva.
-- - En `bookings` se congelan el precio de referencia y el % aplicado;
--   `priceCents` sigue siendo lo cobrado (PaymentIntent, reembolsos y
--   métricas no cambian) y la comisión se calcula sobre él.
--
-- «Vendida» y «caducada» no se guardan: se derivan al leer (reserva
-- confirmada con `slotOfferId`; `expiresAt` pasado). Así no hay que
-- tocar el webhook de Stripe ni depender del único cron diario.
--
-- Ids `text` (String @default(uuid()) en Prisma): sin casts a uuid.
-- Aplicar por el session pooler (5432) o conexión directa.

-- CreateEnum
CREATE TYPE "SlotOfferStatus" AS ENUM ('active', 'withdrawn');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "discountPct" INTEGER,
ADD COLUMN     "originalPriceCents" INTEGER,
ADD COLUMN     "slotOfferId" TEXT;

-- CreateTable
CREATE TABLE "slot_offers" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "sourceBookingId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "discountPctOver2h" INTEGER NOT NULL,
    "discountPct1To2h" INTEGER NOT NULL,
    "discountPctUnder1h" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "SlotOfferStatus" NOT NULL DEFAULT 'active',
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slot_offers_sourceBookingId_key" ON "slot_offers"("sourceBookingId");

-- CreateIndex
CREATE INDEX "slot_offers_providerId_startAt_idx" ON "slot_offers"("providerId", "startAt");

-- CreateIndex
CREATE INDEX "slot_offers_professionalId_startAt_idx" ON "slot_offers"("professionalId", "startAt");

-- CreateIndex
CREATE INDEX "slot_offers_status_startAt_idx" ON "slot_offers"("status", "startAt");

-- CreateIndex
CREATE INDEX "bookings_slotOfferId_idx" ON "bookings"("slotOfferId");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slotOfferId_fkey" FOREIGN KEY ("slotOfferId") REFERENCES "slot_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_offers" ADD CONSTRAINT "slot_offers_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_offers" ADD CONSTRAINT "slot_offers_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_offers" ADD CONSTRAINT "slot_offers_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_offers" ADD CONSTRAINT "slot_offers_sourceBookingId_fkey" FOREIGN KEY ("sourceBookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- -------------------------------------------------------------------------
-- Invariantes que Zod también valida, pero que la BD garantiza siempre.
-- -------------------------------------------------------------------------
ALTER TABLE "slot_offers"
  ADD CONSTRAINT "slot_offers_time_range_check" CHECK ("endAt" > "startAt"),
  ADD CONSTRAINT "slot_offers_expires_before_start_check" CHECK ("expiresAt" <= "startAt"),
  ADD CONSTRAINT "slot_offers_discount_steps_check" CHECK (
    "discountPctOver2h" BETWEEN 0 AND 50 AND "discountPctOver2h" % 5 = 0
    AND "discountPct1To2h" BETWEEN 0 AND 50 AND "discountPct1To2h" % 5 = 0
    AND "discountPctUnder1h" BETWEEN 5 AND 50 AND "discountPctUnder1h" % 5 = 0
  ),
  -- El precio solo baja al acercarse la hora: nunca un tramo más
  -- cercano con menos descuento que uno más lejano.
  ADD CONSTRAINT "slot_offers_discount_non_decreasing_check" CHECK (
    "discountPctOver2h" <= "discountPct1To2h"
    AND "discountPct1To2h" <= "discountPctUnder1h"
  );

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_discount_pct_check" CHECK (
    "discountPct" IS NULL OR "discountPct" BETWEEN 0 AND 50
  ),
  -- Si hay descuento congelado, también el precio de referencia.
  ADD CONSTRAINT "bookings_discount_fields_check" CHECK (
    ("discountPct" IS NULL) = ("originalPriceCents" IS NULL)
  );

-- Una sola oferta activa por profesional y hora de inicio: la misma
-- hora nunca se ofrece a dos precios.
CREATE UNIQUE INDEX "slot_offers_active_professional_start_key"
  ON "slot_offers"("professionalId", "startAt")
  WHERE "status" = 'active';

-- -------------------------------------------------------------------------
-- RLS (obligatorio en tablas nuevas, CLAUDE.md §4). Prisma entra como
-- `postgres` (BYPASSRLS); estas policies son defensa en profundidad
-- para PostgREST, igual que `providers_public_read_approved` (migr. 1).
-- -------------------------------------------------------------------------
ALTER TABLE "slot_offers" ENABLE ROW LEVEL SECURITY;

-- Lectura pública solo de ofertas activas de centros aprobados y no
-- borrados. Sin policies de escritura: denegado por defecto.
CREATE POLICY "slot_offers_public_read_active"
  ON public.slot_offers
  FOR SELECT
  TO anon, authenticated
  USING (
    "status" = 'active'
    AND EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = slot_offers."providerId"
        AND p."verificationStatus" = 'approved'
        AND p."deletedAt" IS NULL
    )
  );
