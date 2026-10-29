-- =========================================================================
-- Migración 9e: facturación de negocios con Stripe Billing
-- =========================================================================
--
-- 1. `provider_billing` (1:1 con providers): Customer, suscripción y su
--    estado en Stripe. Tabla aparte porque la policy pública de
--    `providers` (migración 1) deja leer todas sus columnas a `anon`; los
--    datos de facturación no deben ser públicos. RLS activo, sin policies
--    y sin privilegios para anon/authenticated: solo la app (Prisma como
--    `postgres`, BYPASSRLS) la lee. El advisor `rls_enabled_no_policy` es
--    intencionado, como en `_prisma_migrations` o `bookings`.
--
-- 2. `services.pausedByPlanAt`: marca los servicios que ocultó el límite
--    del plan (siempre con `isActive = false`), para reactivar solo esos
--    al volver a pagar y no los que pausó el negocio a mano. Columna
--    opcional sin default: ALTER instantáneo, sin reescribir filas.
--
-- El plan efectivo sigue en `providers.planId` (comisión y límites).
--
-- Aplicar por el session pooler (5432) o conexión directa (DIRECT_URL).

CREATE TYPE "BillingSubscriptionStatus" AS ENUM (
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused'
);

CREATE TABLE "provider_billing" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "stripeSubscriptionId" TEXT,
  "subscriptionStatus" "BillingSubscriptionStatus",
  "subscribedPlanId" TEXT,
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "scheduledPlanId" TEXT,
  "scheduledChangeAt" TIMESTAMP(3),
  "lastPaymentFailedAt" TIMESTAMP(3),
  "lastFailureNotifiedKey" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "provider_billing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "provider_billing_providerId_key" ON "provider_billing"("providerId");
CREATE UNIQUE INDEX "provider_billing_stripeCustomerId_key" ON "provider_billing"("stripeCustomerId");
CREATE UNIQUE INDEX "provider_billing_stripeSubscriptionId_key" ON "provider_billing"("stripeSubscriptionId");
CREATE INDEX "provider_billing_subscribedPlanId_idx" ON "provider_billing"("subscribedPlanId");
CREATE INDEX "provider_billing_scheduledPlanId_idx" ON "provider_billing"("scheduledPlanId");

ALTER TABLE "provider_billing"
  ADD CONSTRAINT "provider_billing_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "provider_billing"
  ADD CONSTRAINT "provider_billing_subscribedPlanId_fkey"
  FOREIGN KEY ("subscribedPlanId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "provider_billing"
  ADD CONSTRAINT "provider_billing_scheduledPlanId_fkey"
  FOREIGN KEY ("scheduledPlanId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.provider_billing ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_billing FROM anon, authenticated;

ALTER TABLE "services" ADD COLUMN "pausedByPlanAt" TIMESTAMP(3);
