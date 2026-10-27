---
name: migration-naming-9a
description: Convención de nombres de migraciones tras la 9 (9a, 9b...) y estado real de la BD observado en 2026-10-27
metadata:
  type: project
---

Las migraciones se numeran sin ceros a la izquierda (0*init ... 9_booking_refund_audit). Prisma ordena por nombre de carpeta, así que `10_x` quedaría antes de `1_rls_policies`. Se usa `9a*`, `9b*`... (`*`<`a`en ASCII, por eso 9_ < 9a). **Why:** evitar reordenación. **How to apply:** no proponer`10\_`; siguientes: 9b, 9c.

Estado observado 2026-10-27: `_prisma_migrations` tenía 0..9 finalizadas (0*init y 7* con applied_steps_count 0, o sea registradas a mano con migrate resolve). `9a_provider_rating_cache` pendiente de aplicar (revisada: apta). Advisors: 2 WARN function_search_path_mutable preexistentes (sync_service_category_label_cache, propagate_category_name_to_services) y 4 INFO rls_enabled_no_policy (\_prisma_migrations, bookings, users, verification_requests), aceptados (acceso solo vía Prisma/postgres).

El MCP ejecuta SELECT como `supabase_read_only_user`, no como postgres. Las tablas pertenecen a `postgres`.
