-- Migración 7: Provider.stripeAccountId
--
-- Añade el id de la cuenta conectada de Stripe al Provider. Es opcional
-- (null hasta que el dueño completa el onboarding desde /panel/centro)
-- y único (una cuenta Stripe pertenece a un único Provider).
--
-- El estado de habilitación (charges_enabled, payouts_enabled,
-- details_submitted) NO se cachea aquí — se consulta a Stripe bajo
-- demanda para no quedarnos desincronizados con la realidad de la
-- cuenta. Ver `lib/services/payments/payments.service.ts`.

ALTER TABLE "providers"
  ADD COLUMN "stripeAccountId" TEXT;

CREATE UNIQUE INDEX "providers_stripeAccountId_key"
  ON "providers" ("stripeAccountId");
