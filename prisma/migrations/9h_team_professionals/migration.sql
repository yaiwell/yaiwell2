-- 9h: equipo — varios profesionales por negocio.
--
-- Aplicar con `npx prisma migrate deploy` (puerto 5432). No usar
-- `migrate dev` ni `db push`: borrarían los CHECK y los índices parciales
-- que viven solo en SQL.
--
-- `services.professionalId` se mantiene (obsoleta) durante la transición:
-- el código desplegado antes de esta fase la sigue leyendo. Una migración
-- posterior (9i) repetirá el relleno y la borrará.

-- ---------------------------------------------------------------------------
-- service_professionals: quién presta cada servicio (N:M)
-- ---------------------------------------------------------------------------

CREATE TABLE "service_professionals" (
  "serviceId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "service_professionals_pkey" PRIMARY KEY ("serviceId", "professionalId")
);

CREATE INDEX "service_professionals_professionalId_idx"
  ON "service_professionals"("professionalId");

ALTER TABLE "service_professionals"
  ADD CONSTRAINT "service_professionals_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_professionals"
  ADD CONSTRAINT "service_professionals_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Se lee solo desde el servidor (Prisma): sin acceso para los roles públicos.
ALTER TABLE public.service_professionals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_professionals FROM anon, authenticated;

-- Relleno idempotente:
--  1. Servicios con profesional asignado → esa fila.
--  2. Servicios sin profesional → todos los profesionales activos de su
--     negocio (hoy uno por negocio).
INSERT INTO "service_professionals" ("serviceId", "professionalId")
SELECT s."id", s."professionalId"
FROM "services" s
WHERE s."professionalId" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "service_professionals" ("serviceId", "professionalId")
SELECT s."id", p."id"
FROM "services" s
JOIN "professionals" p ON p."providerId" = s."providerId" AND p."deletedAt" IS NULL
WHERE s."professionalId" IS NULL
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- professionals: límites de texto y lectura de los activos
-- ---------------------------------------------------------------------------

ALTER TABLE "professionals"
  ADD CONSTRAINT "professionals_name_length" CHECK (char_length("name") BETWEEN 1 AND 80);
ALTER TABLE "professionals"
  ADD CONSTRAINT "professionals_bio_length" CHECK ("bio" IS NULL OR char_length("bio") <= 300);

CREATE INDEX "professionals_active_provider_idx"
  ON "professionals"("providerId")
  WHERE "deletedAt" IS NULL;

-- ---------------------------------------------------------------------------
-- plans: profesionales por plan
-- ---------------------------------------------------------------------------
-- Decidido 2026-11-03: Gratis 3, Básico 10, Pro 15, Premium ilimitado
-- (NULL = sin límite).

ALTER TABLE "plans" ADD COLUMN "maxProfessionals" INTEGER;
ALTER TABLE "plans"
  ADD CONSTRAINT "plans_max_professionals_positive" CHECK ("maxProfessionals" IS NULL OR "maxProfessionals" > 0);

UPDATE "plans" SET "maxProfessionals" = 3 WHERE "tier" = 'free';
UPDATE "plans" SET "maxProfessionals" = 10 WHERE "tier" = 'basic';
UPDATE "plans" SET "maxProfessionals" = 15 WHERE "tier" = 'pro';
UPDATE "plans" SET "maxProfessionals" = NULL WHERE "tier" = 'premium';
