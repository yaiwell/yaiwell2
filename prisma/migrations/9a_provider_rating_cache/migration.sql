-- =========================================================================
-- Migración 9a: caché de valoraciones en Provider (ratingAvg/ratingCount)
-- =========================================================================
--
-- `providers.ratingAvg` y `providers.ratingCount` son una caché para
-- ordenar y pintar la nota sin agregar `reviews` en cada búsqueda. El
-- schema decía que la recalculaba un trigger, pero ese trigger nunca se
-- creó: los valores que había en BD eran los inventados por
-- `seed-dev.ts`. La ficha mostraba «4.8 · 312 valoraciones» en la
-- cabecera y «Aún no hay reseñas» en la sección de reseñas.
--
-- Qué hace esta migración:
-- 1. `refresh_provider_rating_cache(text)`: recalcula la caché de UN
--    proveedor a partir de sus reseñas.
-- 2. Trigger AFTER INSERT / UPDATE / DELETE sobre `reviews` que la llama
--    para el proveedor afectado (y para el anterior si la reseña cambiara
--    de proveedor).
-- 3. Recalcula una vez la caché de todos los proveedores. Con los datos
--    actuales (0 reseñas) los deja a 0/0, que es lo correcto.
--
-- Qué cuenta como reseña válida:
-- - Reseñas unidas a su reserva por `bookingId` cuyo `bookings.providerId`
--   coincide con `reviews.providerId` (el denormalizado). Una reseña sin
--   reserva del mismo proveedor no debería existir (§4.bis); si existiera,
--   no infla la nota.
-- - NO filtramos por `bookings.status = 'completed'`: el service ya lo
--   exige al crear la reseña, y una reseña publicada **sigue contando**
--   aunque la reserva se reembolse después (`completed` → `refunded`):
--   decisión de producto del 2026-10-27, documentada en CLAUDE.md §4.bis.
--   Por eso el trigger solo escucha `reviews`, y la caché coincide siempre
--   con lo que lista la sección de reseñas de la ficha.
-- - `Review` no tiene `deletedAt` ni estado de moderación: no hay nada más
--   que excluir. Si se añade, hay que filtrarlo aquí y en el trigger.
--
-- Redondeo: `ROUND(AVG(rating)::numeric, 1)` (mitad hacia arriba: 4.25 →
-- 4.3). Sin reseñas, 0 y 0. La UI trata `ratingCount = 0` como «Nuevo en
-- Yaiwell», nunca como «0.0».
--
-- `updatedAt` NO se toca a propósito. Representa la última edición del
-- perfil del centro por su dueño; que alguien deje una reseña no es una
-- edición del centro. Prisma gestiona `@updatedAt` en el cliente, no en
-- SQL, así que este UPDATE crudo lo deja intacto. Además solo escribimos
-- si el valor cambia (`IS DISTINCT FROM`) para no generar filas muertas.
--
-- SECURITY INVOKER (por defecto) con `search_path` fijo:
-- - Hoy todas las escrituras en `reviews` pasan por Prisma con el rol
--   `postgres` (owner de las tablas, con BYPASSRLS), que puede actualizar
--   `providers`. No hace falta elevar privilegios.
-- - Si algún día se permite insertar reseñas desde el cliente con el rol
--   `authenticated` (ver el TODO al final de la migración 1), el INSERT
--   fallaría con «permission denied for table providers». Entonces habrá
--   que pasar estas funciones a SECURITY DEFINER (el `search_path` ya
--   está fijado, que es el requisito de seguridad para hacerlo).
-- - `SET search_path = public` evita el WARN `function_search_path_mutable`
--   del advisor.
--
-- `refresh_provider_rating_cache` es invocable por RPC desde PostgREST si
-- no se restringe: revocamos EXECUTE a PUBLIC, `anon` y `authenticated`.
-- La función de trigger no se puede llamar directamente.
--
-- Ids `text` (String @default(uuid()) en Prisma): sin casts a uuid.
--
-- Solo depende de tablas de `0_init`; no hay RLS nueva porque no se crean
-- tablas. Aplicar por el session pooler (5432) o conexión directa.

-- 1. Recalcular la caché de un proveedor.
CREATE OR REPLACE FUNCTION public.refresh_provider_rating_cache(p_provider_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_avg   double precision;
  v_count integer;
BEGIN
  SELECT
    COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::double precision,
    COUNT(*)::integer
  INTO v_avg, v_count
  FROM public.reviews r
  JOIN public.bookings b
    ON b.id = r."bookingId"
   AND b."providerId" = r."providerId"
  WHERE r."providerId" = p_provider_id;

  UPDATE public.providers p
     SET "ratingAvg"   = v_avg,
         "ratingCount" = v_count
   WHERE p.id = p_provider_id
     AND (p."ratingAvg" IS DISTINCT FROM v_avg
          OR p."ratingCount" IS DISTINCT FROM v_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_provider_rating_cache(text)
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.refresh_provider_rating_cache(text) IS
  'Recalcula providers.ratingAvg/ratingCount a partir de reviews unidas a bookings. Uso interno (trigger y backfill).';

-- 2. Función de trigger: refresca el proveedor afectado.
CREATE OR REPLACE FUNCTION public.reviews_refresh_provider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_provider_rating_cache(NEW."providerId");
  END IF;

  -- En DELETE, o si un UPDATE movió la reseña a otro proveedor, el
  -- proveedor anterior también pierde (o cambia) esa nota.
  IF TG_OP = 'DELETE'
     OR (TG_OP = 'UPDATE' AND OLD."providerId" IS DISTINCT FROM NEW."providerId") THEN
    PERFORM public.refresh_provider_rating_cache(OLD."providerId");
  END IF;

  RETURN NULL; -- AFTER trigger: el valor de retorno se ignora.
END;
$$;

-- Solo las columnas que afectan a la caché: editar el texto, las fotos o
-- la respuesta del proveedor no recalcula nada.
DROP TRIGGER IF EXISTS trg_reviews_refresh_provider_rating ON public.reviews;
CREATE TRIGGER trg_reviews_refresh_provider_rating
  AFTER INSERT OR UPDATE OF rating, "providerId", "bookingId" OR DELETE
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_refresh_provider_rating();

-- Una función que devuelve `trigger` no se puede invocar por RPC, pero
-- Supabase concede EXECUTE por defecto a anon/authenticated: lo retiramos
-- por coherencia con la función auxiliar.
REVOKE EXECUTE ON FUNCTION public.reviews_refresh_provider_rating()
  FROM PUBLIC, anon, authenticated;

-- 3. Backfill: recalcula una vez todos los proveedores (incluidos los que
--    no tienen reseñas, que quedan a 0/0). Misma agregación que la función.
WITH agg AS (
  SELECT
    r."providerId"                                         AS provider_id,
    ROUND(AVG(r.rating)::numeric, 1)::double precision     AS avg_rating,
    COUNT(*)::integer                                      AS review_count
  FROM public.reviews r
  JOIN public.bookings b
    ON b.id = r."bookingId"
   AND b."providerId" = r."providerId"
  GROUP BY r."providerId"
),
target AS (
  SELECT
    p.id,
    COALESCE(agg.avg_rating, 0)   AS avg_rating,
    COALESCE(agg.review_count, 0) AS review_count
  FROM public.providers p
  LEFT JOIN agg ON agg.provider_id = p.id
)
UPDATE public.providers p
   SET "ratingAvg"   = target.avg_rating,
       "ratingCount" = target.review_count
  FROM target
 WHERE p.id = target.id
   AND (p."ratingAvg" IS DISTINCT FROM target.avg_rating
        OR p."ratingCount" IS DISTINCT FROM target.review_count);
