-- ============================================================================
-- FTS Search migration
-- ============================================================================
-- Añade búsqueda full-text en `services` y `providers` usando:
--   - tsvector materializado en columnas GENERATED ... STORED.
--   - Diccionario 'spanish' (stemming es) + 'simple' (catalán y nombres
--     propios sin stemming). Postgres no trae diccionario catalán por
--     defecto en Supabase; 'simple' es el fallback razonable.
--   - GIN sobre el tsvector para ranking (ts_rank_cd).
--   - GIN trigram (gin_trgm_ops) sobre los campos textuales clave para
--     tolerancia a errores tipográficos (similarity()).
--
-- Decisiones de diseño:
--   - Las columnas GENERATED son STORED (no VIRTUAL) porque GIN requiere
--     que la columna esté materializada.
--   - Postgres exige que las expresiones de GENERATED sean IMMUTABLE. Por
--     eso usamos `'spanish'::regconfig` (literal IMMUTABLE) en lugar del
--     overload `to_tsvector(text)` que es STABLE.
--   - `services` no puede referenciar `categories.name` directamente en
--     una columna GENERATED (las subqueries no son IMMUTABLE), así que
--     denormalizamos en `services.category_label_cache` mantenido por
--     dos triggers (uno en services, otro en categories).
--   - Pesos:
--       A = nombre (services.name / providers.businessName)
--       B = descripción
--       C = categoría / address
--     ts_rank_cd los pondera con multiplicadores por defecto (1.0, 0.4,
--     0.2, 0.1 para A/B/C/D).
--
-- Ver `src/lib/services/search/` para el caller y los tests.

-- ============================================================================
-- 1) services.category_label_cache
-- ============================================================================
-- Denormalización: cacheamos `categories.name->>'es' + ->>'ca'` en cada
-- service para que el GENERATED de search_vector pueda construir el peso C
-- sin JOIN (que es lo que prohíbe IMMUTABLE).

ALTER TABLE "services"
  ADD COLUMN "category_label_cache" TEXT NOT NULL DEFAULT '';

-- Backfill inicial desde categories.
UPDATE "services" s
SET "category_label_cache" = COALESCE(c.name->>'es', '') || ' ' || COALESCE(c.name->>'ca', '')
FROM "categories" c
WHERE s."categoryId" = c.id;

-- Trigger BEFORE INSERT/UPDATE en services: cuando cambia el categoryId
-- (o se crea la fila) recalculamos el cache desde la categoría destino.
CREATE OR REPLACE FUNCTION sync_service_category_label_cache()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(c.name->>'es', '') || ' ' || COALESCE(c.name->>'ca', '')
  INTO NEW."category_label_cache"
  FROM "categories" c
  WHERE c.id = NEW."categoryId";
  -- Si no hay match (no debería con la FK), dejamos cadena vacía.
  IF NEW."category_label_cache" IS NULL THEN
    NEW."category_label_cache" := '';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_service_category_label_cache
  BEFORE INSERT OR UPDATE OF "categoryId" ON "services"
  FOR EACH ROW
  EXECUTE FUNCTION sync_service_category_label_cache();

-- Trigger AFTER UPDATE en categories: si cambia el nombre de la categoría,
-- repropagamos el cache a todos los services que la usan. Es un coste
-- bajo: las categorías cambian muy raramente.
CREATE OR REPLACE FUNCTION propagate_category_name_to_services()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE "services"
    SET "category_label_cache" = COALESCE(NEW.name->>'es', '') || ' ' || COALESCE(NEW.name->>'ca', '')
    WHERE "categoryId" = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_category_name_propagate
  AFTER UPDATE OF name ON "categories"
  FOR EACH ROW
  EXECUTE FUNCTION propagate_category_name_to_services();

-- ============================================================================
-- 2) services.search_vector (GENERATED STORED)
-- ============================================================================

ALTER TABLE "services"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish'::regconfig,
      COALESCE(name->>'es', '') || ' ' || COALESCE(name->>'ca', '')
    ), 'A') ||
    setweight(to_tsvector('simple'::regconfig,
      COALESCE(name->>'es', '') || ' ' || COALESCE(name->>'ca', '')
    ), 'A') ||
    setweight(to_tsvector('spanish'::regconfig,
      COALESCE(description->>'es', '') || ' ' || COALESCE(description->>'ca', '')
    ), 'B') ||
    setweight(to_tsvector('simple'::regconfig,
      COALESCE(description->>'es', '') || ' ' || COALESCE(description->>'ca', '')
    ), 'B') ||
    setweight(to_tsvector('spanish'::regconfig, "category_label_cache"), 'C') ||
    setweight(to_tsvector('simple'::regconfig, "category_label_cache"), 'C')
  ) STORED;

CREATE INDEX "services_search_vector_idx"
  ON "services" USING GIN ("search_vector");

-- Trigram sobre name->>'es' y ->>'ca' para fuzzy / typo tolerance.
-- Usamos COALESCE para evitar nulls en la expresión del índice.
CREATE INDEX "services_name_es_trgm_idx"
  ON "services" USING GIN ((COALESCE(name->>'es', '')) gin_trgm_ops);
CREATE INDEX "services_name_ca_trgm_idx"
  ON "services" USING GIN ((COALESCE(name->>'ca', '')) gin_trgm_ops);

-- ============================================================================
-- 3) providers.search_vector (GENERATED STORED)
-- ============================================================================

ALTER TABLE "providers"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish'::regconfig, "businessName"), 'A') ||
    setweight(to_tsvector('simple'::regconfig, "businessName"), 'A') ||
    setweight(to_tsvector('spanish'::regconfig,
      COALESCE(description->>'es', '') || ' ' || COALESCE(description->>'ca', '')
    ), 'B') ||
    setweight(to_tsvector('simple'::regconfig,
      COALESCE(description->>'es', '') || ' ' || COALESCE(description->>'ca', '')
    ), 'B') ||
    setweight(to_tsvector('spanish'::regconfig, address), 'C') ||
    setweight(to_tsvector('simple'::regconfig, address), 'C')
  ) STORED;

CREATE INDEX "providers_search_vector_idx"
  ON "providers" USING GIN ("search_vector");

CREATE INDEX "providers_business_name_trgm_idx"
  ON "providers" USING GIN ("businessName" gin_trgm_ops);
CREATE INDEX "providers_address_trgm_idx"
  ON "providers" USING GIN (address gin_trgm_ops);
