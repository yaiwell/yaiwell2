-- 9k: auditoría del reembolso por incidencia del centro (/admin/reembolsos).
--
-- Aplicar con `npx prisma migrate deploy` (puerto 5432), ANTES de desplegar el
-- código: Prisma lee estas columnas en toda consulta de reservas sin `select`.
--
-- Sin RLS nueva: `bookings` ya la tiene y es privada. Sin FK en
-- `incidentRefundBy`, igual que `refundDismissedBy`: es auditoría y no debe
-- impedir nada sobre el usuario.
ALTER TABLE "bookings"
  ADD COLUMN "incidentRefundAt" TIMESTAMP(3),
  ADD COLUMN "incidentRefundBy" TEXT,
  ADD COLUMN "incidentRefundNote" TEXT;
