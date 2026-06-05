-- =========================================================================
-- Yaiwell — Row Level Security (defensa en profundidad)
-- =========================================================================
--
-- Activa RLS en las 10 tablas y declara las políticas mínimas necesarias
-- para que el catálogo público sea legible sin sesión y el resto quede
-- explícitamente denegado por defecto.
--
-- Modelo de auth actual:
-- - Toda la lógica de negocio pega a la BD vía Prisma con el usuario
--   `postgres` del Session pooler de Supabase. Ese rol es superuser y
--   **bypassa RLS por diseño** (lo cual queremos: la lógica de negocio
--   ya valida ownership en `lib/services/*` con errores tipados).
-- - No usamos el SDK `@supabase/supabase-js` desde el cliente; si en el
--   futuro lo introducimos, las claves `anon` / `authenticated` golpearán
--   estas policies y respetarán los límites de abajo.
--
-- Convención para policies futuras basadas en Clerk:
-- - El JWT template del dashboard de Clerk debe exponer el `clerkId` como
--   `sub` del JWT (es la convención que `auth.jwt() ->> 'sub'` usa).
-- - Cuando se configure, la función `public.requesting_clerk_user_id()`
--   devolverá el clerkId del solicitante y las policies de ownership
--   (ver TODO al final) podrán activarse sin tocar el resto.
-- - Mientras tanto, esa función devolverá NULL y las policies que
--   dependan de ella negarán acceso — comportamiento seguro.
--
-- Decisión: NO usamos `FORCE ROW LEVEL SECURITY`. Si lo activamos,
-- también Prisma sería filtrado por RLS y reventaría la app (no tenemos
-- JWT que entregar desde Prisma). Mantenemos el bypass del rol postgres
-- como contrato explícito y documentado.

-- -------------------------------------------------------------------------
-- 0. Helper: leer el clerkId del JWT actual.
-- -------------------------------------------------------------------------
-- En `SECURITY INVOKER` para que respete los permisos del caller.
-- STABLE porque depende del request actual pero no muta nada — Postgres
-- puede cachearla dentro del statement.

CREATE OR REPLACE FUNCTION public.requesting_clerk_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  -- `auth.jwt()` ya existe en Supabase. Si no hay JWT (anon), devuelve {} y `->>` devuelve NULL.
  SELECT NULLIF(auth.jwt() ->> 'sub', '')::text
$$;

COMMENT ON FUNCTION public.requesting_clerk_user_id() IS
  'Devuelve el clerkId del JWT actual o NULL si no hay sesión. Útil para policies de ownership cuando se integre la auth con Clerk vía JWT template.';

-- -------------------------------------------------------------------------
-- 1. Activar RLS en todas las tablas.
-- -------------------------------------------------------------------------
-- Por defecto, una tabla con RLS activado y sin policies niega TODO
-- (excepto al owner de la tabla y a postgres). Eso es lo que queremos
-- como baseline.

ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans                  ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 2. Catálogo público: categories, plans.
-- -------------------------------------------------------------------------
-- La taxonomía y los planes son metadatos públicos sin coste de
-- privacidad: cualquier visitante puede verlos en la landing y en la
-- página de planes para proveedores.

CREATE POLICY "categories_public_read"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "plans_public_read"
  ON public.plans
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- -------------------------------------------------------------------------
-- 3. Providers verificados: SELECT público.
-- -------------------------------------------------------------------------
-- Solo proveedores con verificación aprobada y no soft-deleted son
-- visibles en el catálogo. El resto vive en su panel privado y solo
-- el owner / admin debería verlos.

CREATE POLICY "providers_public_read_approved"
  ON public.providers
  FOR SELECT
  TO anon, authenticated
  USING (
    "verificationStatus" = 'approved'
    AND "deletedAt" IS NULL
  );

-- M2M visible para los providers que SÍ son públicos.
CREATE POLICY "provider_categories_public_read"
  ON public.provider_categories
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers p
      WHERE p.id = provider_categories."providerId"
        AND p."verificationStatus" = 'approved'
        AND p."deletedAt" IS NULL
    )
  );

-- Profesionales de centros públicos: visibles en la ficha del proveedor.
CREATE POLICY "professionals_public_read"
  ON public.professionals
  FOR SELECT
  TO anon, authenticated
  USING (
    "deletedAt" IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.providers p
      WHERE p.id = professionals."providerId"
        AND p."verificationStatus" = 'approved'
        AND p."deletedAt" IS NULL
    )
  );

-- Servicios de providers aprobados.
CREATE POLICY "services_public_read"
  ON public.services
  FOR SELECT
  TO anon, authenticated
  USING (
    "deletedAt" IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.providers p
      WHERE p.id = services."providerId"
        AND p."verificationStatus" = 'approved'
        AND p."deletedAt" IS NULL
    )
  );

-- -------------------------------------------------------------------------
-- 4. Reviews: SELECT público.
-- -------------------------------------------------------------------------
-- Las reseñas son el corazón social del marketplace; sin verlas no se
-- puede decidir reservar. Solo son visibles las que enlazan con un
-- provider aprobado (consistente con el bloque anterior).

CREATE POLICY "reviews_public_read"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers p
      WHERE p.id = reviews."providerId"
        AND p."verificationStatus" = 'approved'
        AND p."deletedAt" IS NULL
    )
  );

-- -------------------------------------------------------------------------
-- 5. Tablas privadas (deny-all explícito).
-- -------------------------------------------------------------------------
-- `users`, `bookings`, `verification_requests` y todo INSERT/UPDATE/DELETE
-- sobre cualquier tabla quedan **sin policy** → bloqueados para `anon` y
-- `authenticated`. La lógica de negocio sigue funcionando porque Prisma
-- usa el rol `postgres` (bypass de RLS).
--
-- Cuando integremos el JWT template de Clerk añadiremos en una migración
-- separada las policies de ownership concretas (cliente lee sus bookings,
-- provider lee los suyos, admin lee VerificationRequest, etc.). Ese ADR
-- vivirá en `docs/adr/`.

-- -------------------------------------------------------------------------
-- 6. Permisos base para los roles de Supabase.
-- -------------------------------------------------------------------------
-- Supabase concede por defecto `USAGE` sobre el schema public y `SELECT`
-- sobre tablas nuevas a `anon` y `authenticated`. Eso es lo que queremos
-- en combinación con RLS: el rol tiene permiso a nivel SQL pero las
-- policies deciden qué filas devuelve. Sin policy → 0 filas (no error).

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.categories             TO anon, authenticated;
GRANT SELECT ON public.plans                  TO anon, authenticated;
GRANT SELECT ON public.providers              TO anon, authenticated;
GRANT SELECT ON public.provider_categories    TO anon, authenticated;
GRANT SELECT ON public.professionals          TO anon, authenticated;
GRANT SELECT ON public.services               TO anon, authenticated;
GRANT SELECT ON public.reviews                TO anon, authenticated;
-- Tablas privadas: ni siquiera SELECT al grant level. Doble cinturón.
REVOKE ALL ON public.users                    FROM anon, authenticated;
REVOKE ALL ON public.bookings                 FROM anon, authenticated;
REVOKE ALL ON public.verification_requests    FROM anon, authenticated;

-- =========================================================================
-- TODOs para cuando Clerk JWT template esté configurado:
--   - users: SELECT/UPDATE only where clerkId = requesting_clerk_user_id()
--   - bookings: SELECT where client.clerkId = requesting OR provider.owner.clerkId = requesting
--   - verification_requests: SELECT only role=admin (JWT custom claim)
--   - reviews: INSERT only where author.clerkId = requesting AND booking.status='completed'
--   - providers: UPDATE only where owner.clerkId = requesting
-- =========================================================================
