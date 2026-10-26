-- =========================================================================
-- Migración 9: auditoría de reembolsos en Booking
-- =========================================================================
--
-- Hasta ahora, si `stripe.refunds.create` fallaba al cancelar el
-- proveedor, el fallo solo quedaba en Sentry: con dinero de clientes de
-- por medio, soporte necesita una cola consultable. Estas columnas la
-- forman: `refundFailedAt IS NOT NULL AND refundedAt IS NULL` son los
-- reembolsos pendientes de resolver (/admin/reembolsos).
--
-- Todas opcionales y sin default: no reescriben filas existentes y el
-- `ALTER` es instantáneo. La tabla ya tiene RLS (migración 1) y añadir
-- columnas no exige policies nuevas.
--
-- Sin índice para la cola: son unas pocas filas y el filtro por
-- `refundFailedAt` sobre la tabla de reservas es barato a este volumen.
-- El único índice es el UNIQUE de `stripeRefundId`, que garantiza que un
-- mismo refund de Stripe no se asocie a dos reservas.
--
-- Aplicar por el session pooler (5432) o conexión directa (DIRECT_URL).

ALTER TABLE "bookings"
  ADD COLUMN "stripeRefundId" TEXT,
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "refundFailedAt" TIMESTAMP(3),
  ADD COLUMN "refundFailureReason" TEXT;

CREATE UNIQUE INDEX "bookings_stripeRefundId_key"
  ON "bookings" ("stripeRefundId");
