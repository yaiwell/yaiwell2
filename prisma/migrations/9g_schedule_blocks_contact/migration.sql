-- 9g: bloqueos puntuales de agenda y contacto privado del negocio.
--
-- Aplicar con `npx prisma migrate deploy` (puerto 5432). No usar
-- `migrate dev` ni `db push`: borrarían los CHECK y los índices parciales
-- que viven solo en SQL.

-- ---------------------------------------------------------------------------
-- schedule_blocks
-- ---------------------------------------------------------------------------
-- Rango en el que un profesional no atiende (vacaciones, médico, una tarde
-- libre). El motor de disponibilidad lo trata como una ocupación más; al
-- crearlo no puede pisar reservas activas (lo comprueba el servicio bajo el
-- mismo advisory lock que `createBooking`). Quitarlo es un borrado suave
-- para dejar rastro de quién lo quitó.

CREATE TABLE "schedule_blocks" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedBy" TEXT,

  CONSTRAINT "schedule_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "schedule_blocks_end_after_start" CHECK ("endAt" > "startAt"),
  -- Red de seguridad: el servicio limita a 60 días.
  CONSTRAINT "schedule_blocks_max_length" CHECK ("endAt" - "startAt" <= interval '62 days'),
  CONSTRAINT "schedule_blocks_reason_length" CHECK ("reason" IS NULL OR char_length("reason") <= 200)
);

CREATE INDEX "schedule_blocks_active_professional_range_idx"
  ON "schedule_blocks"("professionalId", "startAt", "endAt")
  WHERE "deletedAt" IS NULL;
CREATE INDEX "schedule_blocks_active_provider_start_idx"
  ON "schedule_blocks"("providerId", "startAt")
  WHERE "deletedAt" IS NULL;

ALTER TABLE "schedule_blocks"
  ADD CONSTRAINT "schedule_blocks_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_blocks"
  ADD CONSTRAINT "schedule_blocks_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_blocks"
  ADD CONSTRAINT "schedule_blocks_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- El motivo es privado del negocio: sin acceso desde los roles públicos.
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.schedule_blocks FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- provider_contacts: contacto privado
-- ---------------------------------------------------------------------------
-- Teléfono y email para que soporte contacte con el negocio. Tabla aparte
-- y no columnas de `providers`: esa tabla tiene GRANT SELECT para `anon` y
-- una policy de lectura pública, así que cualquier columna nueva ahí sería
-- legible con la clave pública. No se muestran en la ficha: animaría a
-- reservar y pagar fuera de la app.

CREATE TABLE "provider_contacts" (
  "providerId" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "provider_contacts_pkey" PRIMARY KEY ("providerId"),
  CONSTRAINT "provider_contacts_phone_length" CHECK ("phone" IS NULL OR char_length("phone") <= 32),
  CONSTRAINT "provider_contacts_email_length" CHECK ("email" IS NULL OR char_length("email") <= 254)
);

ALTER TABLE "provider_contacts"
  ADD CONSTRAINT "provider_contacts_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.provider_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_contacts FROM anon, authenticated;
