-- Migración 6: Service.isActive
--
-- Añade el flag de pausa al catálogo de servicios. `true` por defecto
-- para que servicios existentes y nuevos arranquen activos. Cuando
-- esté `false`, la UI del panel pinta el badge `pausado` y los flujos
-- de búsqueda/reserva deben filtrar `WHERE is_active = true` (ese
-- filtro se aplicará en `lib/services/search` y en el motor de
-- availability cuando el dueño pause/reactive desde `/panel/servicios`).

ALTER TABLE "services"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Índice parcial sobre activos: la mayoría de queries de listado
-- pública (búsqueda, ficha de provider) sólo quieren `isActive = true`.
-- Un partial index las hace barato sin penalizar inserts de servicios
-- pausados (cobertura baja en práctica).
CREATE INDEX "idx_services_provider_active"
  ON "services" ("providerId")
  WHERE "isActive" = true;
