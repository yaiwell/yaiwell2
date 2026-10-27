---
name: migration-naming-9a
description: Convención de nombres de migraciones tras la 9 (9a, 9b...) y estado real de la BD observado en 2026-10-27
metadata:
  type: project
---

Las migraciones se numeran sin ceros a la izquierda (0*init ... 9_booking_refund_audit). Prisma ordena por nombre de carpeta, así que `10_x` quedaría antes de `1_rls_policies`. Se usa `9a*`, `9b*`... (`*`<`a`en ASCII, por eso 9_ < 9a). **Why:** evitar reordenación. **How to apply:** no proponer`10\_`; siguientes: 9b, 9c.

Estado verificado 2026-10-27 (tras aplicar 9a): `_prisma_migrations` tiene 0..9 y `9a_provider_rating_cache` finalizadas (finished*at 2026-10-27 09:32 UTC), sin rollback, 11 filas = 11 carpetas locales. 0_init y 7* con applied_steps_count 0 (registradas a mano con migrate resolve). 9a aplicada con migrate deploy: trigger `trg_reviews_refresh_provider_rating` activo, funciones `refresh_provider_rating_cache(text)` y `reviews_refresh_provider_rating()` con search_path=public, SECURITY INVOKER, EXECUTE solo postgres+service_role. 13 providers con ratingAvg/Count = 0, 0 reviews.

Advisors security (línea base aceptada): 2 WARN function_search_path_mutable (sync_service_category_label_cache, propagate_category_name_to_services) y 4 INFO rls_enabled_no_policy (\_prisma_migrations, bookings, users, verification_requests); acceso solo vía Prisma/postgres.

El MCP ejecuta SELECT como `supabase_read_only_user`, no como postgres. Las tablas pertenecen a `postgres`. `list_migrations` y consultas a `_prisma_migrations` con `order by started_at` dieron timeout alguna vez; reintentar con `order by migration_name`.
