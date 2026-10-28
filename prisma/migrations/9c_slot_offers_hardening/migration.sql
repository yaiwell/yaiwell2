-- =========================================================================
-- Migración 9c: endurecer slot_offers (auditoría 2026-10-28)
-- =========================================================================
--
-- 1. Quitamos la lectura pública por PostgREST. La policy de 9b dejaba a
--    `anon` leer todas las columnas de las ofertas activas, incluidos los
--    ids de reservas canceladas (`sourceBookingId`). La app lee siempre
--    por Prisma (rol `postgres`, BYPASSRLS), así que no la necesita: con
--    RLS activa y sin policies, el acceso por la API pública queda
--    denegado, igual que en `bookings` o `users`.
-- 2. Índice que cubre la FK `serviceId` (advisor `unindexed_foreign_keys`):
--    el ON DELETE CASCADE de servicios y las lecturas por servicio del
--    selector de hora dejan de recorrer la tabla.
--
-- Sin datos que migrar. Aplicar por el session pooler (5432) o conexión
-- directa.

DROP POLICY IF EXISTS "slot_offers_public_read_active" ON public.slot_offers;

-- CreateIndex
CREATE INDEX "slot_offers_serviceId_idx" ON "slot_offers"("serviceId");
