import 'server-only';

import { Prisma } from '@prisma/client';

/**
 * Fragmentos SQL compartidos por las consultas raw de `providersRepository`.
 *
 * Viven aparte porque el repositorio superaba las ~250 líneas de §6.bis
 * y porque tener el SELECT en un único sitio evita que `findAll`,
 * `findById` y `findBySlug` diverjan al ampliar columnas (ya pasó con
 * el subquery de categorías, que estaba copiado tres veces).
 *
 * Todos asumen el alias `p` para la tabla `providers`.
 */

/**
 * Categorías a las que pertenece un proveedor, **derivadas de sus
 * servicios publicados** y no de una tabla de asociación.
 *
 * Antes esto agregaba `provider_categories`, y esa tabla **nunca ha
 * tenido ni una fila**: no la escribe el seed, ni el onboarding, ni
 * ningún service. Como el filtro de `/buscar` comprueba
 * `categoryIds.includes(...)`, el resultado era que **cualquier filtro
 * por categoría devolvía cero proveedores** — y sin ningún error a la
 * vista, porque una lista vacía es un resultado legítimo.
 *
 * Se deriva en vez de mantener la tabla porque un dato duplicado que
 * nadie sincroniza es justo lo que provocó el fallo: así un proveedor
 * entra en "Belleza" en cuanto publica un servicio de belleza, y sale
 * cuando lo pausa, sin que nadie tenga que acordarse de nada.
 *
 * Devuelve la categoría del servicio **y toda su ascendencia** (la
 * jerarquía tiene 3 niveles), para que filtrar por la raíz encuentre
 * también los servicios colgados de sus hijas: quien pulsa "Belleza"
 * espera ver manicuras.
 *
 * Solo cuenta servicios activos y no borrados: un proveedor cuyo único
 * servicio de belleza está pausado no debe aparecer bajo "Belleza".
 */
export const CATEGORY_IDS_FRAGMENT = Prisma.sql`(
          SELECT COALESCE(array_agg(DISTINCT ancestry.category_id), ARRAY[]::text[])
          FROM (
            SELECT unnest(ARRAY[c.id, c."parentId", parent."parentId"]) AS category_id
            FROM services s
            JOIN categories c ON c.id = s."categoryId"
            LEFT JOIN categories parent ON parent.id = c."parentId"
            WHERE s."providerId" = p.id
              AND s."deletedAt" IS NULL
              AND s."isActive" = true
          ) ancestry
          WHERE ancestry.category_id IS NOT NULL
        )`;

/**
 * Texto buscable extra de un proveedor: nombres de sus servicios
 * activos y de sus categorías **con ascendencia**, en todos los idiomas
 * que tenga el JSON `name` (es/ca/en/de), concatenados con espacios.
 *
 * Sin esto, "corte" no encontraba a quien ofrece "Corte mujer" salvo
 * que lo repitiera en la descripción, y "uñas" o "masajes" (palabras
 * de categoría) no encontraban nada.
 *
 * `jsonb_path_query(..., '$.*')` recorre los valores del objeto sea
 * cual sea el idioma, y en modo lax devuelve cero filas si el JSON no
 * es un objeto o es NULL (padre inexistente), así que no necesitamos
 * un CASE por cada nivel. El filtro de servicios activos y no borrados
 * es el mismo que el de `CATEGORY_IDS_FRAGMENT`: un servicio pausado
 * no debe hacer que el proveedor aparezca al buscarlo.
 */
export const SEARCH_TEXT_FRAGMENT = Prisma.sql`(
          SELECT COALESCE(string_agg(DISTINCT term.value, ' '), '')
          FROM services s
          JOIN categories c ON c.id = s."categoryId"
          LEFT JOIN categories parent ON parent.id = c."parentId"
          LEFT JOIN categories grandparent ON grandparent.id = parent."parentId"
          CROSS JOIN LATERAL (
            SELECT jsonb_path_query(localized.name, '$.*') #>> '{}' AS value
            FROM (VALUES (s.name), (c.name), (parent.name), (grandparent.name))
              AS localized(name)
          ) term
          WHERE s."providerId" = p.id
            AND s."deletedAt" IS NULL
            AND s."isActive" = true
        )`;

/**
 * Columnas públicas de un proveedor, alineadas con `ProviderRow`.
 *
 * `location` es PostGIS `geography(Point, 4326)` (Prisma la trata como
 * `Unsupported`), de ahí `ST_X`/`ST_Y` para sacar lng/lat al shape
 * `GeoPoint` del dominio.
 */
export const PROVIDER_COLUMNS_FRAGMENT = Prisma.sql`
        p.id,
        p.slug,
        p."businessName",
        p.type::text AS type,
        p.description,
        p.address,
        ST_X(p.location::geometry)::float8 AS lng,
        ST_Y(p.location::geometry)::float8 AS lat,
        p.photos,
        p."ratingAvg",
        p."ratingCount",
        p."priceRange"::text AS "priceRange",
        ${CATEGORY_IDS_FRAGMENT} AS "categoryIds"`;
