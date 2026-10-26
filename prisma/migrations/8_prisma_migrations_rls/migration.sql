-- =========================================================================
-- Migración 8: RLS en la tabla interna de Prisma (_prisma_migrations)
-- =========================================================================
--
-- El advisor de Supabase marca como ERROR (`rls_disabled_in_public`) que
-- `public._prisma_migrations` vive en un schema expuesto por PostgREST sin
-- RLS. Además, Supabase concedió por defecto todos los privilegios a
-- `anon` y `authenticated` al crearse la tabla, así que con la anon key se
-- podía leer y reescribir el historial de migraciones.
--
-- Por qué no rompe Prisma:
-- - `prisma migrate deploy/resolve/status` conectan con el rol `postgres`,
--   que es owner de la tabla y además tiene `BYPASSRLS` (no es superuser).
--   Activar RLS sin policies no le afecta.
-- - Igual que en `1_rls_policies`, NO usamos `FORCE ROW LEVEL SECURITY`:
--   filtraría también al owner y Prisma dejaría de poder registrar
--   migraciones.
--
-- Por qué también REVOKE:
-- - RLS no filtra TRUNCATE, REFERENCES ni TRIGGER. Retirar los privilegios
--   de tabla a `anon`/`authenticated` es el "doble cinturón" que ya
--   aplicamos a las tablas privadas en la migración 1.
-- - `service_role` conserva su acceso (bypass de RLS) por si hiciera falta
--   inspeccionar la tabla desde backend.
--
-- Sin policies a propósito: ningún cliente de la app debe leer esta tabla.
-- El advisor mostrará un INFO `rls_enabled_no_policy`; es intencionado.
--
-- Aplicar por el session pooler (puerto 5432) o conexión directa: el
-- transaction pooler (6543) no admite DDL ni advisory locks.

ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public._prisma_migrations FROM anon, authenticated;
