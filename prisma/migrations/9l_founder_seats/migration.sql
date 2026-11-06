-- 9l: plazas del año de Premium de regalo para los primeros negocios de Mallorca.
--
-- Aplicar con `npx prisma migrate deploy` (puerto 5432), ANTES de desplegar el
-- código: la aprobación de negocios, la sincronización de planes y el panel
-- leen esta tabla.
--
-- Sin cupón de Stripe a propósito: un negocio con plaza no tiene suscripción,
-- ni tarjeta, ni renovación. Las plazas no se liberan: `seatNumber` es único y
-- la asignación se serializa con un advisory lock en la transacción de aprobar.
CREATE TABLE "founder_seats" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "seatNumber" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "notified60At" TIMESTAMP(3),
  "notified15At" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "notifiedEndedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "founder_seats_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "founder_seats_seatNumber_positive" CHECK ("seatNumber" > 0),
  CONSTRAINT "founder_seats_dates_ordered" CHECK ("endsAt" > "startsAt")
);

CREATE UNIQUE INDEX "founder_seats_providerId_key" ON "founder_seats"("providerId");
CREATE UNIQUE INDEX "founder_seats_seatNumber_key" ON "founder_seats"("seatNumber");
CREATE INDEX "founder_seats_endedAt_endsAt_idx" ON "founder_seats"("endedAt", "endsAt");

ALTER TABLE "founder_seats"
  ADD CONSTRAINT "founder_seats_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "providers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Privada: solo el servidor la lee. El contador público sale de un `count` en
-- servidor, nunca de una consulta directa desde el navegador.
ALTER TABLE public.founder_seats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.founder_seats FROM anon, authenticated;

-- Primera aprobación evaluada para la plaza: la elegibilidad se congela ahí y
-- rechazar y volver a aprobar no da otra oportunidad. Queda fuera de las columnas
-- públicas de `providers` (9j concede SELECT por columna). Los ya aprobados cuentan
-- como evaluados: la promoción es para quien entra a partir de ahora.
ALTER TABLE "providers" ADD COLUMN "founderEvaluatedAt" TIMESTAMP(3);
UPDATE "providers" SET "founderEvaluatedAt" = CURRENT_TIMESTAMP
WHERE "verificationStatus" = 'approved';
