-- ============================================================================
-- FTS Multi-language migration (4 idiomas: es, ca, en, de)
-- ============================================================================
-- Extiende el motor FTS existente (ver 2_fts_search) para soportar los
-- 4 idiomas del marketplace: español (es), catalán (ca), inglés (en) y
-- alemán (de). EN/DE se incorporan tras la migración 3_locales_en_de
-- para cubrir el turismo internacional en Mallorca.
--
-- Estrategia:
--   - Cada idioma usa su regconfig nativo cuando existe en Postgres:
--       es -> 'spanish'  (stemming nativo)
--       en -> 'english'  (stemming nativo)
--       de -> 'german'   (stemming nativo)
--       ca -> 'simple'   (fallback: catalán no viene por defecto)
--   - `category_label_cache` se mantiene como 'simple' regconfig porque
--     es metadata interna no localizada (el cache concatena es+ca).
--
-- Las columnas GENERATED no admiten ALTER de expresión: hay que DROP
-- COLUMN y recrear. Postgres borra automáticamente los índices que
-- dependen de la columna al hacer DROP COLUMN, pero añadimos
-- DROP INDEX IF EXISTS defensivo por idempotencia en pipelines.
--
-- Cada idioma se trata como un fragmento independiente (no se concatenan
-- los textos antes de tokenizar) para que cada diccionario procese
-- únicamente el texto en su lengua y no contamine el ranking.
-- COALESCE evita errores cuando name->>'en' o name->>'de' son NULL
-- (los locales en/de son opcionales en LocalizedText).

-- ============================================================================
-- 1) services.search_vector — drop e recreación con 4 idiomas
-- ============================================================================

-- Borramos el índice GIN defensivamente; Postgres normalmente lo elimina
-- al hacer DROP COLUMN, pero IF EXISTS hace la migración idempotente.
DROP INDEX IF EXISTS "services_search_vector_idx";

ALTER TABLE "services" DROP COLUMN IF EXISTS "search_vector";

ALTER TABLE "services"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    -- Peso A: nombre del servicio, un fragmento por idioma.
    setweight(to_tsvector('spanish'::regconfig, COALESCE(name->>'es', '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig,  COALESCE(name->>'ca', '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, COALESCE(name->>'en', '')), 'A') ||
    setweight(to_tsvector('german'::regconfig,  COALESCE(name->>'de', '')), 'A') ||
    -- Peso B: descripción del servicio.
    setweight(to_tsvector('spanish'::regconfig, COALESCE(description->>'es', '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig,  COALESCE(description->>'ca', '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, COALESCE(description->>'en', '')), 'B') ||
    setweight(to_tsvector('german'::regconfig,  COALESCE(description->>'de', '')), 'B') ||
    -- Peso C: cache de etiqueta de categoría (metadata, no localizada).
    setweight(to_tsvector('simple'::regconfig, COALESCE("category_label_cache", '')), 'C')
  ) STORED;

CREATE INDEX "services_search_vector_idx"
  ON "services" USING GIN ("search_vector");

-- Trigram para EN y DE: añadimos GIN trigram sobre name->>'en' y name->>'de'
-- para fuzzy matching en los nuevos idiomas. Los índices de es/ca creados en
-- 2_fts_search siguen vigentes (no se tocan).
CREATE INDEX IF NOT EXISTS "idx_services_name_en_trgm"
  ON "services" USING GIN ((COALESCE(name->>'en', '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_services_name_de_trgm"
  ON "services" USING GIN ((COALESCE(name->>'de', '')) gin_trgm_ops);

-- ============================================================================
-- 2) providers.search_vector — drop y recreación con 4 idiomas
-- ============================================================================
-- providers.businessName NO es localizado (es un nombre comercial único),
-- así que el peso A solo se tokeniza con 'spanish' + 'simple' como antes.
-- description sí es localizada -> 4 fragmentos por idioma.
-- address tampoco es localizada (es texto libre con la dirección física).

DROP INDEX IF EXISTS "providers_search_vector_idx";

ALTER TABLE "providers" DROP COLUMN IF EXISTS "search_vector";

ALTER TABLE "providers"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    -- Peso A: businessName (no localizado, doble tokenización es+simple
    -- para cubrir tanto stemming español como nombres propios sin alterar).
    setweight(to_tsvector('spanish'::regconfig, "businessName"), 'A') ||
    setweight(to_tsvector('simple'::regconfig,  "businessName"), 'A') ||
    -- Peso B: descripción del proveedor, un fragmento por idioma.
    setweight(to_tsvector('spanish'::regconfig, COALESCE(description->>'es', '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig,  COALESCE(description->>'ca', '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, COALESCE(description->>'en', '')), 'B') ||
    setweight(to_tsvector('german'::regconfig,  COALESCE(description->>'de', '')), 'B') ||
    -- Peso C: address (no localizada).
    setweight(to_tsvector('spanish'::regconfig, address), 'C') ||
    setweight(to_tsvector('simple'::regconfig,  address), 'C')
  ) STORED;

CREATE INDEX "providers_search_vector_idx"
  ON "providers" USING GIN ("search_vector");

-- Los índices trigram de providers (businessName, address) creados en
-- 2_fts_search siguen vigentes y no requieren cambios: businessName y
-- address NO son localizados.
