-- =========================================================================
-- Migración 9f: pago en el local, no presentados y sanciones
-- =========================================================================
--
-- Reglas en CLAUDE.md §4.bis (decididas 2026-10-29 y 2026-10-30) y diseño
-- en `docs/design-onsite-payment-2026-10-30.md`.
--
-- 1. `bookings`:
--    - `paymentMode` (`online` | `onsite`), NOT NULL con default `online`:
--      todas las reservas existentes se pagaron online. Default constante:
--      el ALTER es instantáneo (PG ≥ 11), sin reescribir filas.
--    - `noShowAt` / `noShowMarkedBy` (User.id interno): quién y cuándo
--      marcó «no presentado». Opcionales y sin default.
--    - CHECK `bookings_onsite_without_payment_intent`: una reserva en el
--      local nunca lleva PaymentIntent. Así ningún camino de cobro online
--      (checkout reabierto, webhook tardío) puede anclarse a ella.
--    - Nuevo estado `no_show` en `BookingStatus`. `ALTER TYPE … ADD VALUE`
--      no se puede **usar** en la misma transacción en que se añade: aquí
--      ninguna sentencia lo menciona. Un CHECK o índice que lo use irá en
--      una migración `9g_` posterior.
--
-- 2. `client_sanctions`: una sanción por reserva en el local no
--    presentada (`bookingId` único: marcar dos veces no duplica). El
--    bloqueo de 3 meses tras 3 sanciones en 12 meses NO se guarda: lo
--    calcula la app (`computeOnlineOnlyUntil`) sobre las no revocadas.
--    Índice parcial `(userId, occurredAt) WHERE revokedAt IS NULL` para
--    esa lectura, que se hace en cada intento de reservar en el local.
--
-- 3. `onsite_commission_charges`: cola de la comisión de cada reserva en
--    el local completada, a cobrar al negocio por Stripe Billing. Una por
--    reserva (`bookingId` único) y como mucho un concepto de Stripe por
--    fila (`stripeInvoiceItemId` único). `amountCents >= 0` por CHECK.
--
-- 4. `provider_billing`: método de pago listo para las comisiones, último
--    periodo facturado (`YYYY-MM`) y deuda de comisiones (desactiva el
--    pago en el local para reservas nuevas mientras tenga valor).
--
-- 5. `providers.acceptsOnsitePayment`: público a propósito (la ficha lo
--    enseña; la policy pública de `providers` deja leer todas sus
--    columnas). Los datos que deciden si se puede usar de verdad (método
--    de pago, deuda) viven en `provider_billing`, que no es público.
--
-- RLS: las dos tablas nuevas, como `provider_billing` (9e), con RLS activo,
-- sin policies y sin privilegios para anon/authenticated: solo la app
-- (Prisma como `postgres`, BYPASSRLS) las lee. El advisor
-- `rls_enabled_no_policy` es intencionado.
--
-- Ids `text` (Prisma `String @default(uuid())`), como el resto del schema.
--
-- Aplicar por el session pooler (5432) o conexión directa (DIRECT_URL).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE "BookingPaymentMode" AS ENUM ('online', 'onsite');

CREATE TYPE "OnsiteCommissionStatus" AS ENUM (
  'pending',
  'itemized',
  'invoiced',
  'paid',
  'failed',
  'void'
);

ALTER TYPE "BookingStatus" ADD VALUE 'no_show';

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------

ALTER TABLE "bookings"
  ADD COLUMN "paymentMode" "BookingPaymentMode" NOT NULL DEFAULT 'online',
  ADD COLUMN "noShowAt" TIMESTAMP(3),
  ADD COLUMN "noShowMarkedBy" TEXT;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_onsite_without_payment_intent"
  CHECK ("paymentMode" = 'online' OR "stripePaymentIntentId" IS NULL);

-- ---------------------------------------------------------------------------
-- providers / provider_billing
-- ---------------------------------------------------------------------------

ALTER TABLE "providers"
  ADD COLUMN "acceptsOnsitePayment" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "provider_billing"
  ADD COLUMN "onsitePaymentMethodReadyAt" TIMESTAMP(3),
  ADD COLUMN "lastCommissionInvoicePeriod" TEXT,
  ADD COLUMN "commissionDebtSince" TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- client_sanctions
-- ---------------------------------------------------------------------------

CREATE TABLE "client_sanctions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedBy" TEXT,
  "revokeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "client_sanctions_pkey" PRIMARY KEY ("id"),
  -- Hoy solo hay un motivo; ampliar el CHECK si aparece otro.
  CONSTRAINT "client_sanctions_reason_check" CHECK ("reason" IN ('no_show'))
);

CREATE UNIQUE INDEX "client_sanctions_bookingId_key" ON "client_sanctions"("bookingId");
CREATE INDEX "client_sanctions_active_user_occurred_idx"
  ON "client_sanctions"("userId", "occurredAt")
  WHERE "revokedAt" IS NULL;

ALTER TABLE "client_sanctions"
  ADD CONSTRAINT "client_sanctions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_sanctions"
  ADD CONSTRAINT "client_sanctions_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.client_sanctions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_sanctions FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- onsite_commission_charges
-- ---------------------------------------------------------------------------

CREATE TABLE "onsite_commission_charges" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "OnsiteCommissionStatus" NOT NULL DEFAULT 'pending',
  "stripeInvoiceItemId" TEXT,
  "stripeInvoiceId" TEXT,
  "itemizedAt" TIMESTAMP(3),
  "invoicedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "lastErrorAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "onsite_commission_charges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "onsite_commission_charges_amount_check" CHECK ("amountCents" >= 0)
);

CREATE UNIQUE INDEX "onsite_commission_charges_bookingId_key"
  ON "onsite_commission_charges"("bookingId");
CREATE UNIQUE INDEX "onsite_commission_charges_stripeInvoiceItemId_key"
  ON "onsite_commission_charges"("stripeInvoiceItemId");
CREATE INDEX "onsite_commission_charges_status_createdAt_idx"
  ON "onsite_commission_charges"("status", "createdAt");
CREATE INDEX "onsite_commission_charges_providerId_status_idx"
  ON "onsite_commission_charges"("providerId", "status");
CREATE INDEX "onsite_commission_charges_stripeInvoiceId_idx"
  ON "onsite_commission_charges"("stripeInvoiceId");

ALTER TABLE "onsite_commission_charges"
  ADD CONSTRAINT "onsite_commission_charges_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "onsite_commission_charges"
  ADD CONSTRAINT "onsite_commission_charges_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.onsite_commission_charges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.onsite_commission_charges FROM anon, authenticated;
