-- Cierra el NIF (`vatNumber`) a la clave pública de Supabase.
--
-- La policy `providers_public_read_approved` filtra filas, no columnas, así
-- que `anon` y `authenticated` podían leer todas las columnas de los negocios
-- aprobados. La app no lee tablas por PostgREST (Prisma como `postgres`).
--
-- No se revoca el SELECT entero: las policies públicas de `services`,
-- `professionals`, `provider_categories` y `reviews` consultan `providers` con
-- el rol que invoca, y fallarían con «permission denied». Por eso se conceden
-- solo las columnas públicas, entre ellas las tres que usan esas policies.
--
-- Fuera quedan `vatNumber`, `userId`, `stripeAccountId`, `planId` y
-- `search_vector`. Una columna nueva de `providers` queda oculta hasta que se
-- conceda aquí expresamente. `select=*` con esos roles da «permission denied»:
-- un cliente con la clave pública tiene que listar columnas.

REVOKE ALL ON public.providers FROM anon, authenticated;

GRANT SELECT (
  id,
  type,
  "businessName",
  slug,
  description,
  address,
  location,
  photos,
  "priceRange",
  "ratingAvg",
  "ratingCount",
  "verificationStatus",
  "acceptsOnsitePayment",
  "createdAt",
  "updatedAt",
  "deletedAt"
) ON public.providers TO anon, authenticated;
