-- =========================================================================
-- Migración 9d: la BD impide la doble reserva (auditoría 2026-10-26, N7)
-- =========================================================================
--
-- 1. Restricción de exclusión: dos reservas `confirmed` del mismo
--    profesional no pueden solaparse. La app ya lo comprueba antes de
--    escribir (bloqueo por profesional + consulta de solape), pero entre
--    comprobar y escribir quedaba una ventana de milisegundos en
--    `createBooking` y al confirmar un pago con la retención vencida.
--    Ahora la BD es la última palabra: una segunda confirmación solapada
--    falla con 23P01 (`exclusion_violation`) y la app la trata como
--    franja ocupada.
--
--    Solo `confirmed`: las `pending` caducan solas (la retención la
--    resuelve la app) y una `completed` puede haberse marcado antes de su
--    hora. Comprobado el 2026-10-29: 0 pares de `confirmed` solapados.
--
--    Rango semiabierto `[startAt, endAt)`: una cita que termina a las
--    10:00 no choca con la que empieza a las 10:00. `tsrange` porque las
--    columnas son `timestamp` sin zona (Prisma `DateTime`).
--
-- 2. `search_path` fijo en dos funciones de trigger (WARN del advisor
--    `function_search_path_mutable`).
--
-- 3. Descarte manual de entradas de la cola de reembolsos (/admin): quién,
--    cuándo y por qué. Columnas opcionales sin default: el ALTER es
--    instantáneo y no reescribe filas.
--
-- `btree_gist` en el esquema `extensions`, como el resto de extensiones
-- del proyecto: el operador `=` sobre `text` en un índice GiST lo aporta
-- esta extensión (su clase de operadores por defecto se resuelve sin
-- depender del search_path).
--
-- Aplicar por el session pooler (5432) o conexión directa (DIRECT_URL).

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- Rango válido antes de la exclusión: `tsrange` con fin anterior al inicio
-- lanza un error que no es 23P01 y la app no lo trataría como franja
-- ocupada. La app siempre calcula `endAt` desde la duración del servicio;
-- comprobado el 2026-10-29: ninguna fila con `endAt <= startAt`.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_end_after_start" CHECK ("endAt" > "startAt");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap_confirmed"
  EXCLUDE USING gist (
    "professionalId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE (status = 'confirmed');

ALTER FUNCTION public.propagate_category_name_to_services()
  SET search_path = public, extensions;
ALTER FUNCTION public.sync_service_category_label_cache()
  SET search_path = public, extensions;

ALTER TABLE "bookings"
  ADD COLUMN "refundDismissedAt" TIMESTAMP(3),
  ADD COLUMN "refundDismissedBy" TEXT,
  ADD COLUMN "refundDismissReason" TEXT;
